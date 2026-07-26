#!/usr/bin/env python3
"""
ZOYA Limit Detector — OpenCode Rate Limit Detection Engine
Part of ZOYA IP Rotator System

Detects when OpenCode's free model hits rate limits by:
    1. Monitoring OpenCode log files for 429/403/rate-limit errors
    2. Making lightweight probe requests to detect limit patterns
    3. Tracking request timing to predict when limits will hit
    4. Signaling master controller for IP rotation
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
from collections import deque

import requests

# ─── Config ──────────────────────────────────────────────────────────────────
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

LIMIT_CONFIG = CONFIG["limit_detection"]
LOG_DIR = os.path.join(os.path.dirname(__file__), CONFIG["logging"]["log_dir"])
os.makedirs(LOG_DIR, exist_ok=True)

# OpenCode log directory
OPENCODE_LOG_DIR = os.path.join(
    os.environ.get("APPDATA", ""),
    "ai.opencode.desktop", "logs"
)

logging.basicConfig(
    level=getattr(logging, CONFIG["logging"]["log_level"], logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "limit_detector.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ─── Rate Limit Detector ─────────────────────────────────────────────────────

class RateLimitDetector:
    """
    Detects rate limits on OpenCode's free model by monitoring logs,
    tracking request timing, and making probe requests.
    """
    
    def __init__(self):
        self.lock = threading.Lock()
        self.is_limited = False
        self.last_limited_at = None
        self.last_healthy_at = datetime.now()
        self.cooldown_seconds = LIMIT_CONFIG.get("cooldown_seconds", 30)
        
        # Tracking windows for request timing
        self.request_times = deque(maxlen=100)  # Last 100 request timestamps
        self.error_count = 0
        self.consecutive_errors = 0
        self.total_requests = 0
        
        # Known rate limit patterns (log messages)
        self.limit_patterns = [
            re.compile(r'429|Too Many Requests', re.IGNORECASE),
            re.compile(r'403|Forbidden', re.IGNORECASE),
            re.compile(r'rate.limit', re.IGNORECASE),
            re.compile(r'too many requests', re.IGNORECASE),
            re.compile(r'quota.exceeded', re.IGNORECASE),
            re.compile(r'request.limit', re.IGNORECASE),
            re.compile(r'throttl', re.IGNORECASE),
            re.compile(r'retry.after', re.IGNORECASE),
            re.compile(r'model.*overloaded', re.IGNORECASE),
            re.compile(r'service.*unavailable', re.IGNORECASE),
        ]
        
        # Watch file management
        self.watched_files = {}
        self.last_log_scan = None
    
    def _find_latest_log_dir(self):
        """Find the most recent OpenCode log directory"""
        try:
            if not os.path.exists(OPENCODE_LOG_DIR):
                return None
            
            dirs = [d for d in os.listdir(OPENCODE_LOG_DIR) 
                   if os.path.isdir(os.path.join(OPENCODE_LOG_DIR, d))]
            
            if not dirs:
                return None
            
            # Sort by timestamp (dirs are named like 20260720T194115)
            dirs.sort(reverse=True)
            return os.path.join(OPENCODE_LOG_DIR, dirs[0])
        except Exception as e:
            logger.warning(f"Failed to find log dir: {e}")
            return None
    
    def _scan_logs_for_limits(self):
        """Scan OpenCode logs for rate limit indicators"""
        log_dir = self._find_latest_log_dir()
        if not log_dir:
            logger.debug("No OpenCode log directory found")
            return False
        
        found_limit = False
        
        # Check main.log and renderer.log
        for log_file in ["main.log", "renderer.log", "utility.log"]:
            filepath = os.path.join(log_dir, log_file)
            if not os.path.exists(filepath):
                continue
            
            try:
                # Read only the last 500 lines for efficiency
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    # Seek to near the end
                    f.seek(0, 2)
                    file_size = f.tell()
                    
                    if file_size > 50000:  # If file > 50KB, read last portion
                        f.seek(max(0, file_size - 50000))
                        # Skip partial line
                        f.readline()
                    
                    lines = f.readlines()
                
                for line in lines[-100:]:  # Check last 100 lines
                    line_lower = line.lower()
                    for pattern in self.limit_patterns:
                        if pattern.search(line_lower):
                            logger.warning(f"Rate limit detected in {log_file}: {line.strip()[:200]}")
                            found_limit = True
                            break
                    
                    if found_limit:
                        break
                        
            except Exception as e:
                logger.debug(f"Failed to read {log_file}: {e}")
        
        return found_limit
    
    def _make_probe_request(self):
        """
        Make a lightweight probe request to detect if API is rate-limited.
        Uses a simple GET request to a known endpoint to check connectivity.
        """
        probe_urls = [
            "https://httpbin.org/ip",
            "https://api.ipify.org?format=json",
            "https://cloudflare.com/cdn-cgi/trace"
        ]
        
        for url in probe_urls:
            try:
                start = time.time()
                resp = requests.get(
                    url,
                    timeout=15,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                )
                elapsed = time.time() - start
                
                # Record the request
                with self.lock:
                    self.request_times.append(time.time())
                    self.total_requests += 1
                
                # Check if response indicates rate limiting
                if resp.status_code == 429:
                    logger.warning(f"Probe got 429 from {url}")
                    return {"limited": True, "source": "probe", "status": 429, "url": url}
                
                if resp.status_code == 403:
                    logger.warning(f"Probe got 403 from {url}")
                    return {"limited": True, "source": "probe", "status": 403, "url": url}
                
                # Success — connection is working
                return {"limited": False, "source": "probe", "status": resp.status_code, "time": elapsed}
                
            except requests.exceptions.ConnectTimeout:
                logger.debug(f"Probe timeout for {url}")
                continue
            except requests.exceptions.ConnectionError as e:
                logger.debug(f"Probe connection error for {url}: {str(e)[:50]}")
                continue
            except Exception as e:
                logger.debug(f"Probe error for {url}: {str(e)[:50]}")
                continue
        
        # All probes failed — possible network issue or aggressive rate limiting
        logger.warning("All probe requests failed — possible network blockade or rate limiting")
        return {"limited": True, "source": "probe", "error": "all_probes_failed"}
    
    def _analyze_timing(self):
        """
        Analyze request timing to detect rate limit patterns.
        If requests are suddenly failing or timing out, rate limiting may be active.
        """
        with self.lock:
            if len(self.request_times) < 5:
                return {"anomaly": False, "reason": "insufficient_data"}
            
            now = time.time()
            recent = [t for t in self.request_times if now - t < 60]  # Last 60 seconds
            
            if len(recent) < 3:
                return {"anomaly": False, "reason": "low_recent_activity"}
            
            # Check request frequency
            time_span = recent[-1] - recent[0] if len(recent) > 1 else 1
            requests_per_minute = len(recent) / max(time_span / 60, 1)
            
            # Check for consecutive errors
            high_error_rate = self.consecutive_errors >= 3
            
            # If we've made many requests per minute, we might be getting limited
            high_frequency = requests_per_minute > 30
            
            if high_error_rate or high_frequency:
                return {
                    "anomaly": True,
                    "reason": "high_error_rate" if high_error_rate else "high_frequency",
                    "requests_per_minute": round(requests_per_minute, 1),
                    "consecutive_errors": self.consecutive_errors
                }
            
            return {"anomaly": False, "requests_per_minute": round(requests_per_minute, 1)}
    
    def check(self):
        """
        Comprehensive rate limit check.
        Returns dict with limit status and details.
        """
        result = {
            "timestamp": datetime.now().isoformat(),
            "is_limited": False,
            "confidence": 0,
            "sources": [],
            "details": {}
        }
        
        # 1. Check OpenCode logs for limit messages
        log_limit = self._scan_logs_for_limits()
        if log_limit:
            result["sources"].append("log_scan")
            result["confidence"] += 0.4
            result["details"]["log_scan"] = "Rate limit patterns found in OpenCode logs"
        
        # 2. Make probe requests
        probe_result = self._make_probe_request()
        if probe_result.get("limited"):
            result["sources"].append("probe")
            result["confidence"] += 0.3
            result["details"]["probe"] = probe_result
        
        # 3. Analyze timing patterns
        timing = self._analyze_timing()
        if timing.get("anomaly"):
            result["sources"].append("timing_analysis")
            result["confidence"] += 0.3
            result["details"]["timing"] = timing
        
        # Determine final state
        result["is_limited"] = result["confidence"] >= 0.4
        
        with self.lock:
            if result["is_limited"]:
                self.is_limited = True
                self.last_limited_at = datetime.now()
                self.error_count += 1
                self.consecutive_errors += 1
                
                # Check cooldown
                if self.last_healthy_at:
                    cooldown_remaining = max(0, self.cooldown_seconds - 
                        (datetime.now() - self.last_healthy_at).total_seconds())
                    result["cooldown_remaining"] = round(cooldown_remaining, 1)
            else:
                self.is_limited = False
                self.last_healthy_at = datetime.now()
                self.consecutive_errors = 0
            
            result["total_requests"] = self.total_requests
            result["error_count"] = self.error_count
            result["consecutive_errors"] = self.consecutive_errors
        
        return result
    
    def wait_for_recovery(self, timeout=60):
        """
        Wait until rate limit appears to have lifted.
        Returns True if recovered, False if timeout.
        """
        logger.info(f"Waiting for rate limit recovery (timeout: {timeout}s)...")
        
        start = time.time()
        while time.time() - start < timeout:
            result = self.check()
            
            if not result["is_limited"]:
                logger.info(f"Rate limit appears to have lifted after {time.time()-start:.0f}s")
                return True
            
            # Progressive backoff
            elapsed = time.time() - start
            if elapsed < 10:
                time.sleep(2)
            elif elapsed < 30:
                time.sleep(5)
            else:
                time.sleep(10)
        
        logger.warning(f"Rate limit did not lift within {timeout}s timeout")
        return False
    
    def get_status(self):
        """Get current detector status"""
        with self.lock:
            return {
                "is_limited": self.is_limited,
                "last_limited_at": self.last_limited_at.isoformat() if self.last_limited_at else None,
                "last_healthy_at": self.last_healthy_at.isoformat() if self.last_healthy_at else None,
                "total_requests": self.total_requests,
                "error_count": self.error_count,
                "consecutive_errors": self.consecutive_errors,
                "cooldown_seconds": self.cooldown_seconds,
                "log_dir": OPENCODE_LOG_DIR,
                "monitoring": True
            }


# ─── CLI Interface ───────────────────────────────────────────────────────────

def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ZOYA Limit Detector")
    parser.add_argument("command", nargs="?", default="check",
                       choices=["check", "monitor", "wait", "status"])
    parser.add_argument("--timeout", type=int, default=60, help="Wait timeout in seconds")
    parser.add_argument("--interval", type=int, default=5, help="Monitor check interval")
    parser.add_argument("--count", type=int, default=12, help="Number of monitor checks")
    
    args = parser.parse_args()
    detector = RateLimitDetector()
    
    if args.command == "check":
        result = detector.check()
        print(json.dumps(result, indent=2, default=str))
        sys.exit(0 if not result["is_limited"] else 1)
    
    elif args.command == "monitor":
        logger.info(f"Monitoring for rate limits ({args.count} checks every {args.interval}s)...")
        limited_count = 0
        for i in range(args.count):
            result = detector.check()
            status = "⚠️ LIMITED" if result["is_limited"] else "✅ OK"
            print(f"[{i+1}/{args.count}] {status} — confidence: {result['confidence']:.1f}")
            
            if result["is_limited"]:
                limited_count += 1
                print(f"  Sources: {result['sources']}")
                print(f"  Details: {result['details']}")
            
            if i < args.count - 1:
                time.sleep(args.interval)
        
        print(f"\nSummary: {limited_count}/{args.count} checks detected rate limiting")
        sys.exit(0 if limited_count == 0 else 1)
    
    elif args.command == "wait":
        recovered = detector.wait_for_recovery(timeout=args.timeout)
        print(json.dumps({"recovered": recovered, "timeout": args.timeout}, indent=2))
        sys.exit(0 if recovered else 1)
    
    elif args.command == "status":
        status = detector.get_status()
        print(json.dumps(status, indent=2, default=str))


if __name__ == "__main__":
    main()
