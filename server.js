import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getBoard, 
  saveBoard, 
  registerUser, 
  loginUser, 
  resetPasswordWithBirthday,
  updateUserBirthday,
  getUserByToken, 
  deleteSession,
  isPostgresConnected,
  getCategoryRules,
  saveCategoryRule,
  saveCategoryRulesBatch
} from './server/db.js';
import { parseStatementWithGemini, categorizeUnknownTransactions, beautifyTitleWithGemini } from './server/gemini.js';

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
  '.webmanifest': 'application/manifest+json',
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
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return null;
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
        const isPg = isPostgresConnected();
        sendJson(res, 200, { 
          status: 'ok', 
          serverTime: Date.now(),
          database: isPg ? 'postgres' : 'ephemeral-file',
          persistent: isPg
        });
        return;
      }

      // 2. Auth: Register
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const { username, password, birthday } = await parseBody(req);
        try {
          const result = await registerUser(username, password, birthday);
          sendJson(res, 201, { success: true, ...result });
        } catch (authErr) {
          sendJson(res, 400, { success: false, error: authErr.message });
        }
        return;
      }

      // 3. Auth: Login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        try {
          const result = await loginUser(username, password);
          sendJson(res, 200, { success: true, ...result });
        } catch (authErr) {
          sendJson(res, 401, { success: false, error: authErr.message });
        }
        return;
      }

      // 3b. Auth: Reset Password via Birthday
      if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
        const { username, birthday, newPassword } = await parseBody(req);
        try {
          const result = await resetPasswordWithBirthday(username, birthday, newPassword);
          sendJson(res, 200, { success: true, ...result, message: 'Password reset successfully' });
        } catch (err) {
          sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // 4. Auth: Get Current User
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const token = getAuthToken(req);
        const user = await getUserByToken(token);
        if (!user) {
          sendJson(res, 401, { success: false, error: 'Unauthorized' });
          return;
        }
        sendJson(res, 200, { success: true, user });
        return;
      }

      // 4b. Auth: Update Birthday
      if (pathname === '/api/auth/update-birthday' && req.method === 'POST') {
        const token = getAuthToken(req);
        const user = await getUserByToken(token);
        if (!user) {
          sendJson(res, 401, { success: false, error: 'Unauthorized' });
          return;
        }
        const { birthday } = await parseBody(req);
        try {
          await updateUserBirthday(user.id, birthday);
          sendJson(res, 200, { success: true, user: { ...user, birthday }, message: 'Birthday updated successfully' });
        } catch (err) {
          sendJson(res, 400, { success: false, error: err.message });
        }
        return;
      }

      // 5. Auth: Logout
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = getAuthToken(req);
        if (token) {
          await deleteSession(token);
        }
        sendJson(res, 200, { success: true });
        return;
      }

      // 6. GET /api/board
      if (pathname === '/api/board' && req.method === 'GET') {
        const token = getAuthToken(req);
        const user = await getUserByToken(token);

        let boardKey = (reqUrl.searchParams.get('key') || '').trim();
        if (!boardKey) {
          boardKey = user ? `user_${user.id}_default` : 'default';
        }

        const board = await getBoard(boardKey);
        if (!board) {
          sendJson(res, 200, { found: false, boardKey, data: null });
          return;
        }
        sendJson(res, 200, { found: true, boardKey, data: board });
        return;
      }

      // 7. POST /api/board
      if (pathname === '/api/board' && req.method === 'POST') {
        const token = getAuthToken(req);
        const user = await getUserByToken(token);

        let boardKey = (reqUrl.searchParams.get('key') || '').trim();
        if (!boardKey) {
          boardKey = user ? `user_${user.id}_default` : 'default';
        }

        const payload = await parseBody(req);
        const { tasks, settings, activeTaskId, updatedAt = Date.now(), force = false } = payload;

        if (!force) {
          const existing = await getBoard(boardKey);
          if (existing && existing.updatedAt && existing.updatedAt > updatedAt) {
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

      // 8. POST /api/expenses/parse-statement (Gemini AI PDF/Document Statement Extraction)
      if (pathname === '/api/expenses/parse-statement' && req.method === 'POST') {
        const payload = await parseBody(req);
        const { fileBase64, mimeType, fileName } = payload;
        try {
          const result = await parseStatementWithGemini({ fileBase64, mimeType, fileName });
          sendJson(res, 200, { success: true, ...result });
        } catch (aiErr) {
          sendJson(res, 400, { success: false, error: aiErr.message });
        }
        return;
      }

      // 9. GET /api/expenses/rules
      if (pathname === '/api/expenses/rules' && req.method === 'GET') {
        const rules = await getCategoryRules();
        sendJson(res, 200, { success: true, rules });
        return;
      }

      // 10. POST /api/expenses/rules
      if (pathname === '/api/expenses/rules' && req.method === 'POST') {
        const payload = await parseBody(req);
        const { pattern, category, rules } = payload;
        if (rules && typeof rules === 'object') {
          const updated = await saveCategoryRulesBatch(rules);
          sendJson(res, 200, { success: true, rules: updated });
          return;
        }
        if (pattern && category) {
          await saveCategoryRule(pattern, category);
          const updated = await getCategoryRules();
          sendJson(res, 200, { success: true, rules: updated });
          return;
        }
        sendJson(res, 400, { success: false, error: 'pattern and category or rules object required' });
        return;
      }

      // 11. POST /api/expenses/categorize-unknown (Gemini AI Batch Categorizer & Regex Learner)
      if (pathname === '/api/expenses/categorize-unknown' && req.method === 'POST') {
        const payload = await parseBody(req);
        const { items } = payload;
        if (!Array.isArray(items) || items.length === 0) {
          sendJson(res, 200, { success: true, categorized: [], newRules: {} });
          return;
        }
        try {
          const result = await categorizeUnknownTransactions(items);
          if (result.newRules && Object.keys(result.newRules).length > 0) {
            await saveCategoryRulesBatch(result.newRules);
          }
          sendJson(res, 200, { success: true, categorized: result.categorized, newRules: result.newRules });
        } catch (catErr) {
          sendJson(res, 400, { success: false, error: catErr.message });
        }
        return;
      }

      // 12. POST /api/tasks/beautify-title (Gemini AI Title Summarization)
      if (pathname === '/api/tasks/beautify-title' && req.method === 'POST') {
        const payload = await parseBody(req);
        const { title, apiKey } = payload || {};
        if (!title || typeof title !== 'string' || !title.trim()) {
          sendJson(res, 400, { success: false, error: 'A valid title string is required' });
          return;
        }
        try {
          const result = await beautifyTitleWithGemini({ title: title.trim(), apiKey });
          sendJson(res, 200, { success: true, ...result });
        } catch (aiErr) {
          sendJson(res, 400, { success: false, error: aiErr.message });
        }
        return;
      }

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
