import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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

function syncApiPlugin(): Plugin {
  return {
    name: 'sync-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = reqUrl.pathname;

        res.setHeader('Content-Type', 'application/json');

        const readBody = () => {
          return new Promise<any>((resolve) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
            });
          });
        };

        const getAuthToken = () => {
          const header = (req.headers.authorization as string) || '';
          if (header.toLowerCase().startsWith('bearer ')) {
            return header.slice(7).trim();
          }
          return null;
        };

        if (pathname === '/api/health' && req.method === 'GET') {
          const isPg = isPostgresConnected();
          res.statusCode = 200;
          res.end(JSON.stringify({ 
            status: 'ok', 
            serverTime: Date.now(),
            database: isPg ? 'postgres' : 'ephemeral-file',
            persistent: isPg
          }));
          return;
        }

        // Auth endpoints
        if (pathname === '/api/auth/register' && req.method === 'POST') {
          const { username, password, birthday } = await readBody();
          try {
            const result = await registerUser(username, password, birthday);
            res.statusCode = 201;
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (pathname === '/api/auth/login' && req.method === 'POST') {
          const { username, password } = await readBody();
          try {
            const result = await loginUser(username, password);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (err: any) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
          const { username, birthday, newPassword } = await readBody();
          try {
            const result = await resetPasswordWithBirthday(username, birthday, newPassword);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ...result, message: 'Password reset successfully' }));
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (pathname === '/api/auth/me' && req.method === 'GET') {
          const token = getAuthToken();
          const user = await getUserByToken(token);
          if (!user) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, user }));
          return;
        }

        if (pathname === '/api/auth/update-birthday' && req.method === 'POST') {
          const token = getAuthToken();
          const user = await getUserByToken(token);
          if (!user) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const { birthday } = await readBody();
          try {
            await updateUserBirthday(user.id, birthday);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, user: { ...user, birthday }, message: 'Birthday updated successfully' }));
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (pathname === '/api/auth/logout' && req.method === 'POST') {
          const token = getAuthToken();
          if (token) await deleteSession(token);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Board endpoints
        if (pathname === '/api/board' && req.method === 'GET') {
          const token = getAuthToken();
          const user = await getUserByToken(token);

          let boardKey = (reqUrl.searchParams.get('key') || '').trim();
          if (!boardKey) {
            boardKey = user ? `user_${user.id}_default` : 'default';
          }

          const board = await getBoard(boardKey);
          res.statusCode = 200;
          res.end(JSON.stringify({ found: !!board, boardKey, data: board }));
          return;
        }

        if (pathname === '/api/board' && req.method === 'POST') {
          const token = getAuthToken();
          const user = await getUserByToken(token);

          let boardKey = (reqUrl.searchParams.get('key') || '').trim();
          if (!boardKey) {
            boardKey = user ? `user_${user.id}_default` : 'default';
          }

          const payload = await readBody();
          const { tasks, settings, activeTaskId, updatedAt = Date.now(), force = false } = payload;
          if (!force) {
            const existing = await getBoard(boardKey);
            if (existing && existing.updatedAt && existing.updatedAt > updatedAt) {
              res.statusCode = 409;
              res.end(JSON.stringify({ conflict: true, serverBoard: existing }));
              return;
            }
          }
          const saved = await saveBoard(boardKey, {
            tasks,
            settings,
            activeTaskId,
            updatedAt: Math.max(updatedAt, Date.now()),
          });
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, boardKey, data: saved }));
          return;
        }

        // Gemini statement parsing endpoint
        if (pathname === '/api/expenses/parse-statement' && req.method === 'POST') {
          const payload = await readBody();
          const { fileBase64, mimeType, fileName } = payload;
          try {
            const result = await parseStatementWithGemini({ fileBase64, mimeType, fileName });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (aiErr: unknown) {
            const errMessage = aiErr instanceof Error ? aiErr.message : 'Unknown AI parsing error';
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: errMessage }));
          }
          return;
        }

        // GET /api/expenses/rules
        if (pathname === '/api/expenses/rules' && req.method === 'GET') {
          const rules = await getCategoryRules();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, rules }));
          return;
        }

        // POST /api/expenses/rules
        if (pathname === '/api/expenses/rules' && req.method === 'POST') {
          const payload = await readBody();
          const { pattern, category, rules } = payload;
          if (rules && typeof rules === 'object') {
            const updated = await saveCategoryRulesBatch(rules);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, rules: updated }));
            return;
          }
          if (pattern && category) {
            await saveCategoryRule(pattern, category);
            const updated = await getCategoryRules();
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, rules: updated }));
            return;
          }
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'pattern and category or rules object required' }));
          return;
        }

        // POST /api/expenses/categorize-unknown
        if (pathname === '/api/expenses/categorize-unknown' && req.method === 'POST') {
          const payload = await readBody();
          const { items } = payload;
          if (!Array.isArray(items) || items.length === 0) {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, categorized: [], newRules: {} }));
            return;
          }
          try {
            const result = await categorizeUnknownTransactions(items);
            if (result.newRules && Object.keys(result.newRules).length > 0) {
              await saveCategoryRulesBatch(result.newRules);
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, categorized: result.categorized, newRules: result.newRules }));
          } catch (catErr: unknown) {
            const errMessage = catErr instanceof Error ? catErr.message : 'Unknown AI categorization error';
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: errMessage }));
          }
          return;
        }

        // POST /api/tasks/beautify-title
        if (pathname === '/api/tasks/beautify-title' && req.method === 'POST') {
          const payload = await readBody();
          const { title } = payload || {};
          if (!title || typeof title !== 'string' || !title.trim()) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'A valid title string is required' }));
            return;
          }
          try {
            const result = await beautifyTitleWithGemini({ title: title.trim() });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (aiErr: unknown) {
            const errMessage = aiErr instanceof Error ? aiErr.message : 'Unknown AI beautification error';
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: errMessage }));
          }
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [react(), syncApiPlugin()],
    server: {
      port: 3000,
      host: true,
    },
    preview: {
      port: 3000,
      host: true,
    },
  };
});
