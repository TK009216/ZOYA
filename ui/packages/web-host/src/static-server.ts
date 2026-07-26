/**
 * WebUI static server.
 *
 * Serves out/renderer/ as the SPA and reverse-proxies /api/*, /ws, /api/stt/stream,
 * /login and /logout to aioncore. All auth goes to backend's aionui-auth crate;
 * /login and /logout are aionui-auth's top-level paths, the rest live under
 * /api/auth/*. /ws and /api/stt/stream are WebSocket/stream upgrades spliced at
 * TCP level; /api/stt/stream is the STT streaming endpoint.
 *
 * Design: Node native http + serve-handler. No Express. No business routes.
 */

import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import https from 'node:https';
import { networkInterfaces } from 'node:os';
import net, { type Socket } from 'node:net';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import serveHandler from 'serve-handler';

const __filename = fileURLToPath(import.meta.url);
const __imageDir = path.resolve(path.dirname(__filename), '..', '..', '..', '..', 'images');

export type StaticServerOptions = {
  staticDir: string;
  backendPort: number;
  port?: number;
  allowRemote?: boolean;
};

export type StaticServerHandle = {
  port: number;
  url: string;
  localUrl: string;
  networkUrl?: string;
  lanIP?: string;
  stop: () => Promise<void>;
};

const DEFAULT_PORT = 25808;

function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

/** Minimal HTTP(S) GET that returns the response body as a string. */
function httpGet(url: string, headers: Record<string, string> = {}, timeout = 15000): Promise<string> {
  const mod = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers, timeout }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

/** Try to parse JSON, throw with response preview on failure. */
function safeParseJSON(text: string, urlHint: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`Empty response from ${urlHint}`);
  try {
    return JSON.parse(trimmed);
  } catch {
    const snippet = trimmed.slice(0, 400).replace(/[\x00-\x1f]/g, ' ');
    throw new Error(
      `Non-JSON response from ${urlHint}. ` +
      `Status 200 but body starts with: "${snippet}"`,
    );
  }
}

/** Fetch model IDs + names from a provider API and return objects. */
async function fetchProviderModels(baseURL: string, apiKey: string, platform: string, timeoutMs = 15000): Promise<Array<{ id: string; name?: string }>> {
  const normalisedUrl = baseURL.replace(/\/+$/, '');

  async function doFetch(path: string, fetchHeaders: Record<string, string>, label: string): Promise<string> {
    const fullUrl = /^https?:\/\//i.test(path) ? path : `${normalisedUrl}${path}`;
    return httpGet(fullUrl, fetchHeaders, timeoutMs);
  }

  if (platform === 'gemini' || platform === 'google') {
    const basePath = normalisedUrl;
    const apiPath = basePath.includes('/v1beta') || basePath.includes('/v1/')
      ? `${basePath}/models`
      : `${basePath}/v1beta/models`;
    const fullUrl = `${apiPath}?key=${encodeURIComponent(apiKey)}`;
    const data = await doFetch(fullUrl, {}, 'Gemini');
    const body = safeParseJSON(data, fullUrl);
    return (body.models as Array<Record<string, unknown>> || [])
      .map((m) => {
        const raw = String(m.name || '');
        const id = raw.replace(/^models\//, '');
        return id ? { id, name: String(m.displayName || m.display_name || id) } : null;
      })
      .filter(Boolean) as Array<{ id: string; name?: string }>;
  }

  if (platform === 'anthropic') {
    const fullUrl = `${normalisedUrl}/models`;
    const data = await httpGet(fullUrl, {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }, timeoutMs);
    const body = safeParseJSON(data, fullUrl);
    return (body.data as Array<Record<string, unknown>> || [])
      .map((m) => {
        const id = String(m.id || m.name || '');
        return id ? { id, name: String(m.display_name || m.displayName || id) } : null;
      })
      .filter(Boolean) as Array<{ id: string; name?: string }>;
  }

  // OpenAI-compatible â€” GET /models with Bearer token
  // Try the standard path first; if it returns garbage, try without /v1
  const pathsToTry = ['/models', '/v1/models'];
  let lastError: Error | null = null;

  for (const p of pathsToTry) {
    const fullUrl = `${normalisedUrl}${p}`;
    try {
      const data = await httpGet(fullUrl, { Authorization: `Bearer ${apiKey}` }, timeoutMs);
      const body = safeParseJSON(data, fullUrl);
      const items = (body.data as Array<Record<string, unknown>> || body.models as Array<Record<string, unknown>> || []);
      if (items.length > 0) {
        return items
          .map((m) => {
            const id = String(m.id || m.model || m.name || '');
            return id ? { id, name: String(m.displayName || m.display_name || m.owned_by || id) } : null;
          })
          .filter(Boolean) as Array<{ id: string; name?: string }>;
      }
      lastError = new Error('API returned empty model list');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try next path
    }
  }

  throw lastError || new Error('Failed to fetch models from all known paths');
}

/** Maximum POST body size in bytes (10 MB). */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

/** Collect POST body from an IncomingMessage into a string, rejecting if it exceeds MAX_BODY_BYTES. */
function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} byte limit`));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function forwardToBackend(req: IncomingMessage, res: ServerResponse, backendPort: number): void {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: backendPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${backendPort}` },
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxy.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'BACKEND_UNREACHABLE' }));
    } else {
      res.destroy();
    }
  });
  req.pipe(proxy);
}

// Max bytes we peek before forcing a routing decision. An HTTP request-line
// on its own is typically < 100 bytes; a full header block is < 2 KB. If we
// haven't seen a newline after 4 KB the client is sending something weird â€”
// hand it to the internal HTTP server and let it return 400.
const PEEK_LIMIT_BYTES = 4096;

/**
 * Splice `client` to a TCP endpoint on `targetPort`. Any bytes already read
 * from `client` during peek are replayed to the upstream as the first write,
 * so the endpoint sees the full HTTP request as-sent.
 */
function spliceToTcpEndpoint(client: Socket, targetPort: number, initialBytes: Buffer): void {
  client.setNoDelay(true);
  client.setKeepAlive(true);
  client.setTimeout(0);
  const upstream = net.connect({ host: '127.0.0.1', port: targetPort });
  upstream.setNoDelay(true);
  upstream.setKeepAlive(true);
  upstream.once('connect', () => {
    if (initialBytes.length > 0) upstream.write(initialBytes);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  const tearDown = (): void => {
    client.destroy();
    upstream.destroy();
  };
  upstream.on('error', tearDown);
  client.on('error', tearDown);
  upstream.on('close', tearDown);
  client.on('close', tearDown);
}

/**
 * Decide routing from the first chunk of an incoming HTTP connection:
 *  - `true`  â†’ `GET /ws[...] HTTP/1.x` or `GET /api/stt/stream[...] HTTP/1.x` (WebSocket/stream upgrades), splice to backend
 *  - `false` â†’ any other HTTP method / path, hand to internal HTTP server
 *  - `null`  â†’ need more bytes (no CRLF yet)
 *
 * We only check the request-line; `Upgrade: websocket` is not strictly
 * required â€” the backend will reject a non-upgrade GET on these paths on its own.
 * Keeping the rule simple means we can decide after the first ~50 bytes
 * instead of waiting for the full header block.
 */
function peekWsRoute(buf: Buffer): boolean | null {
  const newlineIdx = buf.indexOf(0x0a); // \n
  if (newlineIdx < 0) return null;
  const firstLine = buf.slice(0, newlineIdx).toString('ascii');
  return /^GET\s+\/(?:ws|api\/stt\/stream)(?:\?[^\s]*)?\s+HTTP\/1\.[01]\r?$/.test(firstLine);
}

export async function startStaticServer(opts: StaticServerOptions): Promise<StaticServerHandle> {
  const port = opts.port ?? DEFAULT_PORT;
  // Ensure the images directory exists (for ZOYA image gen)
  if (!fs.existsSync(__imageDir)) fs.mkdirSync(__imageDir, { recursive: true });
  const allowRemote = opts.allowRemote === true;
  const host = allowRemote ? '0.0.0.0' : '127.0.0.1';

  // The HTTP server listens only on loopback â€” user traffic hits the outer
  // net.Server first. We route to this server for everything except WS
  // upgrades and STT stream upgrades, which go straight to the backend via a raw TCP splice.
  //
  // Why two listeners instead of using `http.Server`'s native `upgrade` event:
  // bun 1.3's http-compat layer does not faithfully forward writes on the
  // socket delivered to the `upgrade` handler, so the backend's 101 response
  // never reaches the browser (see #2824). Making the outer listener pure
  // TCP avoids touching that code path on both bun and node.
  const http_server: Server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        res.writeHead(400).end();
        return;
      }

      // /api/zoya/* â€” ZOYA-specific endpoints
      if (req.url.startsWith('/api/zoya/')) {
        if (req.method === 'GET' && req.url === '/api/zoya/config') {
          const home = os.homedir();
          const configPath = path.join(home, '.config', 'zoya', 'zoya.jsonc');
          try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(raw);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(parsed));
          } catch {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({}));
          }
          return;
        }
        if (req.method === 'POST' && req.url === '/api/zoya/config') {
          let body = '';
          let totalBytes = 0;
          req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_BODY_BYTES) {
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (totalBytes > MAX_BODY_BYTES) {
              res.writeHead(413, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds ${MAX_BODY_BYTES} byte limit` }));
              return;
            }
            try {
              const payload = JSON.parse(body);
              const home = os.homedir();
              const configs = [
                path.join(home, '.config', 'zoya', 'zoya.jsonc'),
                path.join(home, '.config', 'opencode', 'opencode.jsonc'),
              ];
              for (const configPath of configs) {
                const dir = path.dirname(configPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                let existing: Record<string, unknown> = {};
                try {
                  const raw = fs.readFileSync(configPath, 'utf-8');
                  existing = JSON.parse(raw);
                } catch { /* new file or broken JSON â€” start fresh */ }
                if (payload.model) existing.model = payload.model;
                if (payload.small_model) existing.small_model = payload.small_model;
                if (payload.provider) existing.provider = payload.provider;
                if (payload.$schema && !existing.$schema) existing.$schema = payload.$schema;
                fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
              }
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'INVALID_CONFIG', message: String(err) }));
            }
          });
          return;
        }
        if (req.method === 'POST' && req.url === '/api/zoya/restart') {
          try {
            if (process.platform === 'win32') {
              execSync(
                `powershell -Command "Get-CimInstance Win32_Process -Filter \\"CommandLine like '%zoya%acp%'\\" | ForEach-Object { Stop-Process $_.ProcessId -Force }"`,
                { stdio: 'ignore', timeout: 5000 },
              );
            } else {
              execSync("pkill -f 'zoya.*acp'", { stdio: 'ignore', timeout: 5000 });
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'ZOYA agent restarting...' }));
          } catch {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Restart signal sent' }));
          }
          return;
        }
        if (req.method === 'GET' && req.url === '/api/zoya/agent-groups') {
          const home = os.homedir();
          const groupsPath = path.join(home, '.config', 'zoya', 'agent-groups.jsonc');
          try {
            const raw = fs.readFileSync(groupsPath, 'utf-8');
            const parsed = JSON.parse(raw);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(parsed));
          } catch {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ currentMode: 'fast', groups: [] }));
          }
          return;
        }
        if (req.method === 'POST' && req.url === '/api/zoya/agent-groups') {
          let body = '';
          let totalBytes = 0;
          req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_BODY_BYTES) {
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (totalBytes > MAX_BODY_BYTES) {
              res.writeHead(413, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds ${MAX_BODY_BYTES} byte limit` }));
              return;
            }
            try {
              const payload = JSON.parse(body);
              const home = os.homedir();
              const groupsPath = path.join(home, '.config', 'zoya', 'agent-groups.jsonc');
              const dir = path.dirname(groupsPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(groupsPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'INVALID_CONFIG', message: String(err) }));
            }
          });
          return;
        }
        if (req.method === 'POST' && req.url === '/api/zoya/mode') {
          let body = '';
          let totalBytes = 0;
          req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_BODY_BYTES) {
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (totalBytes > MAX_BODY_BYTES) {
              res.writeHead(413, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds ${MAX_BODY_BYTES} byte limit` }));
              return;
            }
            try {
              const payload = JSON.parse(body);
              const home = os.homedir();
              const groupsPath = path.join(home, '.config', 'zoya', 'agent-groups.jsonc');
              const dir = path.dirname(groupsPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              let existing: Record<string, unknown> = {};
              try {
                const raw = fs.readFileSync(groupsPath, 'utf-8');
                existing = JSON.parse(raw);
              } catch { /* start fresh */ }
              existing.currentMode = payload.currentMode;
              fs.writeFileSync(groupsPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'INVALID_MODE', message: String(err) }));
            }
          });
          return;
        }
        // GET /api/zoya/images/* — serve locally downloaded images
        if (req.method === 'GET' && req.url.startsWith('/api/zoya/images/')) {
          const filename = path.basename(req.url.replace('/api/zoya/images/', ''));
          const imgPath = path.join(__imageDir, filename);
          // Security: only allow known image extensions
          if (!/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(filename) || !fs.existsSync(imgPath)) {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'NOT_FOUND' }));
            return;
          }
          const ext = path.extname(filename).toLowerCase();
          const mime: Record<string, string> = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
          };
          const stat = fs.statSync(imgPath);
          res.writeHead(200, {
            'content-type': mime[ext] || 'application/octet-stream',
            'content-length': stat.size,
            'cache-control': 'public, max-age=86400',
          });
          fs.createReadStream(imgPath).pipe(res);
          return;
        }

        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND' }));
        return;
      }

      // /api/assets/logos/brand/* â€” serve locally so custom brand logos
      // (e.g. zoya.svg) work without backend support.
      if (req.url.startsWith('/api/assets/logos/brand/')) {
        const rewrittenUrl = req.url.replace('/api/', '/');
        const originalUrl = req.url;
        req.url = rewrittenUrl;
        try {
          await serveHandler(req, res, {
            public: opts.staticDir,
          });
        } finally {
          req.url = originalUrl;
        }
        return;
      }

      // /api/providers/* â€” model fetching & protocol detection (bypass AionCore)
      if (req.url.startsWith('/api/providers/')) {
        if (req.method === 'POST' && req.url === '/api/providers/fetch-models') {
          try {
            const body = await collectBody(req);
            const { base_url, api_key, platform } = JSON.parse(body);
            if (!base_url) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: 'base_url is required' }));
              return;
            }
            const models = await fetchProviderModels(base_url, api_key || '', platform || 'custom');
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ models }));
          } catch (err) {
            res.writeHead(502, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'FETCH_FAILED', message: String(err) }));
          }
          return;
        }
        if (req.method === 'POST' && req.url === '/api/providers/detect-protocol') {
          try {
            const body = await collectBody(req);
            const { base_url, api_key, timeout } = JSON.parse(body);
            if (!base_url) {
              res.writeHead(400, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'base_url is required' }));
              return;
            }
            let protocol = 'unknown';
            let modelRows: Array<{ id: string }> = [];
            try {
              const rows = await fetchProviderModels(base_url, api_key || '', 'openai', timeout);
              if (rows.length > 0) { modelRows = rows; protocol = 'openai-compatible'; }
            } catch { /* fall through */ }
            if (modelRows.length === 0) {
              try {
                const rows = await fetchProviderModels(base_url, api_key || '', 'gemini', timeout);
                if (rows.length > 0) { modelRows = rows; protocol = 'gemini'; }
              } catch { /* fall through */ }
            }
            if (modelRows.length === 0) {
              try {
                const rows = await fetchProviderModels(base_url, api_key || '', 'anthropic', timeout);
                if (rows.length > 0) { modelRows = rows; protocol = 'anthropic'; }
              } catch { /* fall through */ }
            }
            const modelIds = modelRows.map((m) => m.id);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
              success: modelIds.length > 0,
              protocol: modelIds.length > 0 ? protocol : 'unknown',
              models: modelIds,
              confidence: modelIds.length > 0 ? 90 : 0,
              ...(modelIds.length === 0 ? { error: 'Could not detect protocol â€” no models returned from any known format' } : {}),
            }));
          } catch (err) {
            res.writeHead(502, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(err) }));
          }
          return;
        }
        // All other /api/providers/* (CRUD) â€” proxy to backend
        forwardToBackend(req, res, opts.backendPort);
        return;
      }

      // /api/* â€” reverse proxy to backend (includes /api/auth/*).
      // /login and /logout are aionui-auth's top-level auth endpoints: proxy them too
      // so WebUI browser clients reach the backend without a path-rewrite.
      if (req.url.startsWith('/api/') || req.url.startsWith('/api?') || req.url === '/login' || req.url === '/logout') {
        forwardToBackend(req, res, opts.backendPort);
        return;
      }

      // static files + SPA fallback
      // serve-handler's cleanUrls defaults to true, which redirects
      // /index.html → /index → /. We disable it to prevent that chain.
      // Root `/` also needs special handling: serve-handler lists the
      // directory content when cleanUrls:false for root, so we redirect
      // it to index.html first.
      const urlPath = new URL(req.url, 'http://localhost').pathname;
      // sw.js — serve 204 No Content to force browser to remove old SW
      if (urlPath === '/sw.js') {
        res.writeHead(204, {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Clear-Site-Data': '"cache","storage"'
        });
        res.end();
        return;
      }
      if (urlPath === '/' || path.extname(urlPath) === '') {
        const search = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        req.url = '/index.html' + search;
      }
      await serveHandler(req, res, {
        public: opts.staticDir,
        cleanUrls: false,
        headers: [
          { source: '**/*.js', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
          { source: '**/*.css', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
          { source: '**/*.html', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'Clear-Site-Data', value: '"cache","storage"' }] },
        ],
      });
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
      } else {
        res.destroy();
      }
    }
  });

  // Internal HTTP server â€” 127.0.0.1 ephemeral port, never visible to the user.
  await new Promise<void>((resolve, reject) => {
    http_server.once('error', reject);
    http_server.listen(0, '127.0.0.1', () => {
      http_server.off('error', reject);
      resolve();
    });
  });
  const internalPort = (http_server.address() as { port: number } | null)?.port;
  if (!internalPort) {
    throw new Error('internal HTTP server failed to bind to a port');
  }

  // User-facing listener: inspect the first line of every TCP connection and
  // route to either the backend (for /ws and /api/stt/stream upgrades) or the internal HTTP
  // server (everything else). Both routes use raw TCP splice â€” no reliance
  // on http.Server's upgrade event.
  const tcp_server = net.createServer((client: Socket) => {
    let peeked = Buffer.alloc(0);
    let settled = false;
    const cleanup = (): void => {
      if (settled) return;
      settled = true;
      client.removeListener('data', onData);
      client.removeListener('error', onEarlyError);
      client.removeListener('end', onEarlyEnd);
    };
    const onData = (chunk: Buffer): void => {
      peeked = Buffer.concat([peeked, chunk]);
      const decision = peekWsRoute(peeked);
      if (decision === null && peeked.length < PEEK_LIMIT_BYTES) return;
      cleanup();
      const target = decision === true ? opts.backendPort : internalPort;
      spliceToTcpEndpoint(client, target, peeked);
    };
    const onEarlyError = (): void => {
      cleanup();
      client.destroy();
    };
    const onEarlyEnd = (): void => {
      // Client closed before we saw a request line â€” nothing to route.
      cleanup();
      client.destroy();
    };
    client.on('data', onData);
    client.on('error', onEarlyError);
    client.on('end', onEarlyEnd);
  });

  await new Promise<void>((resolve, reject) => {
    tcp_server.once('error', reject);
    tcp_server.listen(port, host, () => {
      tcp_server.off('error', reject);
      resolve();
    });
  });

  const actualPort = (tcp_server.address() as { port: number } | null)?.port ?? port;
  const lanIP = allowRemote ? (getLanIP() ?? undefined) : undefined;
  const localUrl = `http://127.0.0.1:${actualPort}`;
  const networkUrl = lanIP ? `http://${lanIP}:${actualPort}` : undefined;

  return {
    port: actualPort,
    url: networkUrl ?? localUrl,
    localUrl,
    networkUrl,
    lanIP,
    stop: () =>
      new Promise<void>((resolve) => {
        tcp_server.close(() => {
          http_server.close(() => resolve());
        });
      }),
  };
}

export async function stopStaticServer(handle: StaticServerHandle): Promise<void> {
  await handle.stop();
}
