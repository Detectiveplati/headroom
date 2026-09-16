import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { getBoard, saveBoard } from './server/db.js';

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

        if (pathname === '/api/health' && req.method === 'GET') {
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ok', serverTime: Date.now() }));
          return;
        }

        if (pathname === '/api/board' && req.method === 'GET') {
          const boardKey = (reqUrl.searchParams.get('key') || 'default').trim();
          const board = await getBoard(boardKey);
          res.statusCode = 200;
          res.end(JSON.stringify({ found: !!board, boardKey, data: board }));
          return;
        }

        if (pathname === '/api/board' && req.method === 'POST') {
          const boardKey = (reqUrl.searchParams.get('key') || 'default').trim();
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = body ? JSON.parse(body) : {};
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
            } catch (err: unknown) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: (err as Error).message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), syncApiPlugin()],
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
});
