import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBoard, saveBoard } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

// Helper to send JSON response with CORS
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Guard against payloads larger than 5MB
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ==================== REST API ENDPOINTS ====================
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health check
      if (pathname === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, { status: 'ok', serverTime: Date.now() });
        return;
      }

      // 2. GET /api/board
      if (pathname === '/api/board' && req.method === 'GET') {
        const boardKey = (reqUrl.searchParams.get('key') || 'default').trim();
        const board = await getBoard(boardKey);
        if (!board) {
          sendJson(res, 200, { found: false, boardKey, data: null });
          return;
        }
        sendJson(res, 200, { found: true, boardKey, data: board });
        return;
      }

      // 3. POST /api/board
      if (pathname === '/api/board' && req.method === 'POST') {
        const boardKey = (reqUrl.searchParams.get('key') || 'default').trim();
        const payload = await parseBody(req);
        const { tasks, settings, activeTaskId, updatedAt = Date.now(), force = false } = payload;

        // Check for conflicts if not force
        if (!force) {
          const existing = await getBoard(boardKey);
          if (existing && existing.updatedAt && existing.updatedAt > updatedAt) {
            // Server has newer edits
            sendJson(res, 409, {
              conflict: true,
              message: 'Server has newer updates',
              serverBoard: existing,
            });
            return;
          }
        }

        const saved = await saveBoard(boardKey, {
          tasks,
          settings,
          activeTaskId,
          updatedAt: Math.max(updatedAt, Date.now()),
        });

        sendJson(res, 200, { success: true, boardKey, data: saved });
        return;
      }

      // Unknown API route
      sendJson(res, 404, { error: 'API route not found' });
      return;
    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      sendJson(res, 500, { error: apiErr.message || 'Internal API Error' });
      return;
    }
  }

  // ==================== STATIC ASSETS & SPA ROUTING ====================
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if target file exists
  fs.stat(safePath, (err, stats) => {
    let targetFile = safePath;
    let isSpaFallback = false;

    if (err || stats.isDirectory()) {
      targetFile = path.join(DIST_DIR, 'index.html');
      isSpaFallback = true;
    }

    fs.readFile(targetFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - Did you run "npm run build"?');
        return;
      }

      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const cacheControl = isSpaFallback || ext === '.html'
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000, immutable';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Headroom] Production server running on http://${HOST}:${PORT}`);
});
