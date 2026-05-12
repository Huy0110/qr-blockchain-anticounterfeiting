#!/usr/bin/env node
/**
 * Tiny static server for the dApp's `out/` directory with SPA-style
 * fallbacks for the two dynamic routes:
 *
 *   /:locale/projects/<phi>       → /:locale/projects/placeholder/index.html
 *   /:locale/scan/<phi>/<sid>     → /:locale/scan/placeholder/placeholder/index.html
 *
 * The static export emits a single "placeholder" shell per dynamic route;
 * the client component then reads the real :phi / :sid from
 * window.location.pathname. For local Playwright runs (and the eventual
 * IPFS gateway rewrite rule), this server replicates that behaviour.
 *
 * Usage:
 *   node test/serve-static.cjs [out-dir] [port]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out'));
const PORT = Number(process.argv[3] || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

function rewrite(urlPath) {
  // Strip trailing slash for matching, but the actual file lookup uses /index.html.
  const clean = urlPath.split('?')[0].split('#')[0];

  // /:locale/projects/<phi>(/) → placeholder shell
  const projMatch = clean.match(/^\/(vi|en)\/projects\/(?!placeholder(?:\/|$))[^/]+\/?$/);
  if (projMatch) return `/${projMatch[1]}/projects/placeholder/index.html`;

  // /:locale/scan/<phi>/<sid>(/) → placeholder shell
  const scanMatch = clean.match(
    /^\/(vi|en)\/scan\/(?!placeholder\/placeholder(?:\/|$))[^/]+\/[^/]+\/?$/,
  );
  if (scanMatch) return `/${scanMatch[1]}/scan/placeholder/placeholder/index.html`;

  return clean;
}

function resolveFile(reqPath) {
  let p = rewrite(reqPath);
  // Trim leading slash, decode.
  let rel = decodeURIComponent(p.replace(/^\/+/, ''));
  let full = path.join(OUT_DIR, rel);

  // If it's a directory, append index.html.
  try {
    const stat = fs.statSync(full);
    if (stat.isDirectory()) full = path.join(full, 'index.html');
  } catch {
    // Try appending /index.html for clean URLs.
    if (!path.extname(full)) {
      const candidate = path.join(full, 'index.html');
      if (fs.existsSync(candidate)) full = candidate;
    }
  }
  return full;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end();
    return;
  }
  const filePath = resolveFile(req.url);
  // Block path traversal.
  if (!filePath.startsWith(OUT_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to /404.html when present (Next emits one).
      const notFound = path.join(OUT_DIR, '404.html');
      if (fs.existsSync(notFound)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync(notFound));
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`serve-static: ${OUT_DIR} on http://localhost:${PORT}`);
});
