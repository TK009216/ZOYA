#!/usr/bin/env python3
"""
ZOYA Proxy Engine — Free Proxy Fetcher, Tester & Rotator
Part of ZOYA IP Rotator System

Features:
    - Scrapes multiple free proxy sources
    - Tests proxies for liveness against configurable endpoint
    - Maintains a working proxy pool with JSON cache
    - Auto-rotates on demand
    - Exposes JSON API for master controller
"""

import json
import os
import re
import sys
import time
import logging
import threading
from datetime import datetime, timedelta
from pathlib import Path

import requests
from urllib.parse import urlparse

# ─── Config ──────────────────────────────────────────────────────────────────
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

PROXY_CONFIG = CONFIG["proxy"]
LIMIT_CONFIG = CONFIG["limit_detection"]
PATHS = CONFIG["paths"]

LOG_DIR = os.path.join(os.path.dirname(__file__), CONFIG["logging"]["log_dir"])
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
PROXY_CACHE_PATH = os.path.join(os.path.dirname(__file__), PATHS["proxy_list_cache"])

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, CONFIG["logging"]["log_level"], logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "proxy_engine.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ─── Proxy Sources ────────────────────────────────────────────────────────────

def fetch_sslproxies():
    """Scrape https://sslproxies.org for HTTP/HTTPS proxies"""
    proxies = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get("https://sslproxies.org", headers=headers, timeout=20)
        resp.raise_for_status()
        
        # Parse the table - sslproxies has a standard table structure
        # Looking for patterns like <td>IP</td><td>PORT</td><td>COUNTRY</td>...
        html = resp.text
        
        # Find proxy table
        table_pattern = re.compile(
            r'<tr[^>]*>.*?<td[^>]*>(\d+\.\d+\.\d+\.\d+)</td>.*?<td[^>]*>(\d+)</td>.*?</tr>',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in table_pattern.finditer(html):
            ip = match.group(1)
            port = match.group(2)
            if ip and port:
                proxies.append({
                    "ip": ip,
                    "port": int(port),
                    "protocol": "http",
                    "source": "sslproxies"
                })
        
        logger.info(f"sslproxies.org: found {len(proxies)} proxies")
    except Exception as e:
        logger.warning(f"Failed to fetch sslproxies: {e}")
    
    return proxies


def fetch_free_proxy_list():
    """Scrape https://free-proxy-list.net for proxies"""
    proxies = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get("https://free-proxy-list.net", headers=headers, timeout=20)
        resp.raise_for_status()
        
        html = resp.text
        
        # Parse table rows
        table_pattern = re.compile(
            r'<tr[^>]*>.*?<td[^>]*>(\d+\.\d+\.\d+\.\d+)</td>.*?<td[^>]*>(\d+)</td>.*?<td[^>]*>([^<]+)</td>.*?<td[^>]*class="[^"]*"[^>]*>([^<]+)</td>',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in table_pattern.finditer(html):
            ip = match.group(1)
            port = match.group(2)
            code = match.group(3).strip()
            https_text = match.group(4).strip().lower()
            
            protocol = "https" if "yes" in https_text else "http"
            
            if ip and port:
                proxies.append({
                    "ip": ip,
                    "port": int(port),
                    "protocol": protocol,
                    "source": "free-proxy-list"
                })
        
        logger.info(f"free-proxy-list.net: found {len(proxies)} proxies")
    except Exception as e:
        logger.warning(f"Failed to fetch free-proxy-list: {e}")
    
    return proxies


def fetch_geonode():
    """Scrape https://geonode.com/free-proxy-list"""
    proxies = []
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get("https://geonode.com/free-proxy-list", headers=headers, timeout=20)
        resp.raise_for_status()
        
        html = resp.text
        
        # Geonode uses a table with data attributes
        table_pattern = re.compile(
            r'<td[^>]*>(\d+\.\d+\.\d+\.\d+)</td>\s*<td[^>]*>(\d+)</td>',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in table_pattern.finditer(html):
            ip = match.group(1)
            port = match.group(2)
            if ip and port:
                proxies.append({
                    "ip": ip,
                    "port": int(port),
                    "protocol": "http",
                    "source": "geonode"
                })
        
        logger.info(f"geonode.com: found {len(proxies)} proxies")
    except Exception as e:
        logger.warning(f"Failed to fetch geonode: {e}")
    
    return proxies


def fetch_all_proxies():
    """Fetch proxies from all configured sources"""
    all_proxies = []
    
    fetchers = [
        ("sslproxies", fetch_sslproxies),
        ("free-proxy-list", fetch_free_proxy_list),
        ("geonode", fetch_geonode),
    ]
    
    seen = set()
    
    for name, fetcher in fetchers:
        try:
            proxies = fetcher()
            for p in proxies:
                key = f"{p['ip']}:{p['port']}"
                if key not in seen:
                    seen.add(key)
                    all_proxies.append(p)
        except Exception as e:
            logger.error(f"Fetcher {name} failed: {e}")
    
    logger.info(f"Total unique proxies fetched: {len(all_proxies)}")
    return all_proxies


# ─── Proxy Testing ───────────────────────────────────────────────────────────

def test_proxy(proxy, test_url=None, timeout=None):
    """Test if a proxy is working by connecting to the test URL"""
    if test_url is None:
        test_url = PROXY_CONFIG.get("test_url", "https://httpbin.org/ip")
    if timeout is None:
        timeout = PROXY_CONFIG.get("test_timeout_seconds", 10)
    
    proxy_url = f"{proxy['protocol']}://{proxy['ip']}:{proxy['port']}"
    proxies_dict = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    try:
        start = time.time()
        resp = requests.get(
            test_url,
            proxies=proxies_dict,
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        elapsed = time.time() - start
        resp.raise_for_status()
        
        # Verify we got a valid response
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        
        return {
            "working": True,
            "response_time": round(elapsed, 2),
            "status_code": resp.status_code,
            "test_url": test_url
        }
    except requests.exceptions.ConnectTimeout:
        return {"working": False, "error": "Connection timeout"}
    except requests.exceptions.ReadTimeout:
        return {"working": False, "error": "Read timeout"}
    except requests.exceptions.ProxyError as e:
        return {"working": False, "error": f"Proxy error: {str(e)[:50]}"}
    except requests.exceptions.RequestException as e:
        return {"working": False, "error": f"Request failed: {str(e)[:50]}"}
    except Exception as e:
        return {"working": False, "error": f"Unknown: {str(e)[:50]}"}


def test_proxies_batch(proxies, max_workers=10):
    """Test a batch of proxies concurrently"""
    import concurrent.futures
    
    working = []
    tested = 0
    
    logger.info(f"Testing {len(proxies)} proxies (max workers: {max_workers})...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_proxy = {
            executor.submit(test_proxy, proxy): proxy 
            for proxy in proxies
        }
        
        for future in concurrent.futures.as_completed(future_to_proxy):
            proxy = future_to_proxy[future]
            tested += 1
            
            try:
                result = future.result()
                if result["working"]:
                    proxy["tested_at"] = datetime.now().isoformat()
                    proxy["response_time"] = result["response_time"]
                    proxy["status_code"] = result["status_code"]
                    working.append(proxy)
                    
                    if tested % 5 == 0 or tested == len(proxies):
                        logger.info(f"  Tested {tested}/{len(proxies)} — {len(working)} working so far")
                else:
                    if tested % 20 == 0:
                        logger.info(f"  Tested {tested}/{len(proxies)} — {len(working)} working")
            except Exception as e:
                logger.debug(f"Worker failed for {proxy['ip']}:{proxy['port']}: {e}")
    
    # Sort by response time (fastest first)
    working.sort(key=lambda x: x.get("response_time", 999))
    
    logger.info(f"Proxy testing complete: {len(working)}/{len(proxies)} working")
    return working


# ─── Cache Management ────────────────────────────────────────────────────────

def load_proxy_cache():
    """Load cached working proxies"""
    try:
        if os.path.exists(PROXY_CACHE_PATH):
            with open(PROXY_CACHE_PATH, "r") as f:
                data = json.load(f)
            
            # Filter out expired proxies (older than 1 hour)
            fresh = []
            for p in data:
                tested_at = p.get("tested_at")
                if tested_at:
                    tested_time = datetime.fromisoformat(tested_at)
                    if datetime.now() - tested_time < timedelta(hours=1):
                        fresh.append(p)
            
            logger.info(f"Loaded {len(fresh)} fresh proxies from cache ({len(data)} total, {len(data)-len(fresh)} expired)")
            return fresh
    except Exception as e:
        logger.warning(f"Failed to load proxy cache: {e}")
    
    return []


def save_proxy_cache(proxies):
    """Save working proxies to cache"""
    try:
        with open(PROXY_CACHE_PATH, "w") as f:
            json.dump(proxies, f, indent=2)
        logger.info(f"Saved {len(proxies)} proxies to cache")
    except Exception as e:
        logger.warning(f"Failed to save proxy cache: {e}")


# ─── Proxy Rotator ───────────────────────────────────────────────────────────

class ProxyRotator:
    """
    Thread-safe proxy rotator that maintains a pool of working proxies
    and provides round-robin rotation.
    """
    
    def __init__(self):
        self.lock = threading.Lock()
        self.working_proxies = []
        self.current_index = 0
        self.last_refresh = None
        self.refresh_interval = PROXY_CONFIG.get("rotation_interval_seconds", 120)
        self.min_pool = PROXY_CONFIG.get("min_proxies_pool", 10)
        self.max_pool = PROXY_CONFIG.get("max_proxies_pool", 50)
        self.refreshing = False
        
        # Load cached proxies on init
        cached = load_proxy_cache()
        if cached:
            self.working_proxies = cached[:self.max_pool]
            logger.info(f"Initialized with {len(self.working_proxies)} cached proxies")
    
    def get_next_proxy(self):
        """Get the next working proxy (round-robin)"""
        with self.lock:
            if not self.working_proxies:
                logger.warning("No working proxies available")
                return None
            
            proxy = self.working_proxies[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.working_proxies)
            
            return proxy
    
    def get_proxy_dict(self):
        """Get next proxy as a requests-compatible dict"""
        proxy = self.get_next_proxy()
        if not proxy:
            return None
        
        proxy_url = f"{proxy['protocol']}://{proxy['ip']}:{proxy['port']}"
        return {
            "http": proxy_url,
            "https": proxy_url
        }
    
    def get_all_proxies(self):
        """Get all working proxies"""
        with self.lock:
            return list(self.working_proxies)
    
    def mark_bad(self, proxy):
        """Remove a non-working proxy from the pool"""
        with self.lock:
            key = f"{proxy['ip']}:{proxy['port']}"
            before = len(self.working_proxies)
            self.working_proxies = [
                p for p in self.working_proxies 
                if f"{p['ip']}:{p['port']}" != key
            ]
            after = len(self.working_proxies)
            
            if before != after:
                logger.info(f"Removed bad proxy {key} — pool: {before}→{after}")
                
                # Adjust index if needed
                if self.current_index >= len(self.working_proxies):
                    self.current_index = 0
    
    def refresh_pool(self, force=False):
        """Refresh the proxy pool by fetching and testing new proxies"""
        if self.refreshing and not force:
            logger.info("Refresh already in progress, skipping")
            return False
        
        self.refreshing = True
        try:
            # Check if refresh is needed
            now = datetime.now()
            if not force and self.last_refresh:
                elapsed = (now - self.last_refresh).total_seconds()
                if elapsed < self.refresh_interval and len(self.working_proxies) >= self.min_pool:
                    logger.debug(f"Pool healthy ({len(self.working_proxies)} proxies), skipping refresh")
                    return True
            
            logger.info(f"Refreshing proxy pool (current: {len(self.working_proxies)})...")
            
            # Fetch fresh proxies
            raw_proxies = fetch_all_proxies()
            
            if not raw_proxies:
                logger.warning("No proxies fetched from any source")
                return False
            
            # Test them
            working = test_proxies_batch(raw_proxies, max_workers=20)
            
            with self.lock:
                # Mix with existing working proxies (keep the fastest)
                combined = working + self.working_proxies
                # Remove duplicates
                seen = set()
                unique = []
                for p in combined:
                    key = f"{p['ip']}:{p['port']}"
                    if key not in seen:
                        seen.add(key)
                        unique.append(p)
                
                # Sort by response time
                unique.sort(key=lambda x: x.get("response_time", 999))
                
                # Keep top N
                self.working_proxies = unique[:self.max_pool]
                self.current_index = 0
                self.last_refresh = now
            
            # Save to cache
            save_proxy_cache(self.working_proxies)
            
            logger.info(f"Pool refreshed: {len(self.working_proxies)} working proxies")
            return len(self.working_proxies) > 0
            
        except Exception as e:
            logger.error(f"Failed to refresh proxy pool: {e}")
            return False
        finally:
            self.refreshing = False
    
    def get_stats(self):
        """Get proxy pool statistics"""
        with self.lock:
            return {
                "total_proxies": len(self.working_proxies),
                "min_pool": self.min_pool,
                "max_pool": self.max_pool,
                "healthy": len(self.working_proxies) >= self.min_pool,
                "last_refresh": self.last_refresh.isoformat() if self.last_refresh else None,
                "refresh_interval": self.refresh_interval,
                "current_index": self.current_index,
                "fastest_proxy": self.working_proxies[0] if self.working_proxies else None
            }


# ─── CLI Interface ───────────────────────────────────────────────────────────

def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ZOYA Proxy Engine")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "refresh", "get-proxy", "list", "test-all"])
    parser.add_argument("--count", type=int, default=5, help="Number of proxies to list")
    
    args = parser.parse_args()
    rotator = ProxyRotator()
    
    if args.command == "status":
        stats = rotator.get_stats()
        print(json.dumps(stats, indent=2))
    
    elif args.command == "refresh":
        success = rotator.refresh_pool(force=True)
        stats = rotator.get_stats()
        print(json.dumps({"success": success, **stats}, indent=2))
    
    elif args.command == "get-proxy":
        proxy = rotator.get_next_proxy()
        if proxy:
            print(json.dumps(proxy, indent=2))
        else:
            print(json.dumps({"error": "No proxies available"}, indent=2))
            sys.exit(1)
    
    elif args.command == "list":
        proxies = rotator.get_all_proxies()
        print(json.dumps(proxies[:args.count], indent=2))
    
    elif args.command == "test-all":
        raw = fetch_all_proxies()
        working = test_proxies_batch(raw, max_workers=20)
        save_proxy_cache(working)
        print(json.dumps({
            "total_fetched": len(raw),
            "total_working": len(working),
            "proxies": working[:args.count]
        }, indent=2))


if __name__ == "__main__":
    main()
