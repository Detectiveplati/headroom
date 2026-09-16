import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Check if PostgreSQL is available via Railway DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'boards.json');

// Memory cache for file-based fallback
let fileBoardsCache = null;

if (DATABASE_URL) {
  console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' && !DATABASE_URL.includes('localhost') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  // Initialize table
  pool.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id VARCHAR(255) PRIMARY KEY,
      tasks JSONB NOT NULL,
      settings JSONB NOT NULL,
      active_task_id VARCHAR(255),
      updated_at BIGINT NOT NULL
    );
  `).then(() => {
    console.log('[Database] PostgreSQL boards table initialized successfully.');
  }).catch((err) => {
    console.error('[Database] Failed to initialize PostgreSQL table, falling back to local file storage:', err.message);
    pool = null;
  });
} else {
  console.log('[Database] No DATABASE_URL found. Using local JSON store at data/boards.json');
}

// Local file storage helpers
function ensureFileStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_FILE)) {
    fs.writeFileSync(JSON_FILE, JSON.stringify({}), 'utf-8');
  }
  if (fileBoardsCache === null) {
    try {
      fileBoardsCache = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    } catch {
      fileBoardsCache = {};
    }
  }
}

function saveFileStore() {
  ensureFileStore();
  const tmpFile = `${JSON_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(fileBoardsCache, null, 2), 'utf-8');
  fs.renameSync(tmpFile, JSON_FILE);
}

/**
 * Retrieve board data by ID / key
 */
export async function getBoard(boardId = 'default') {
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM boards WHERE id = $1', [boardId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          tasks: row.tasks,
          settings: row.settings,
          activeTaskId: row.active_task_id,
          updatedAt: Number(row.updated_at),
        };
      }
      return null;
    } catch (err) {
      console.error('[Database] PostgreSQL getBoard error:', err.message);
    }
  }

  // Fallback to file storage
  ensureFileStore();
  return fileBoardsCache[boardId] || null;
}

/**
 * Save board data by ID / key
 */
export async function saveBoard(boardId = 'default', boardData) {
  const { tasks = [], settings = {}, activeTaskId = null, updatedAt = Date.now() } = boardData;

  if (pool) {
    try {
      await pool.query(`
        INSERT INTO boards (id, tasks, settings, active_task_id, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          tasks = EXCLUDED.tasks,
          settings = EXCLUDED.settings,
          active_task_id = EXCLUDED.active_task_id,
          updated_at = EXCLUDED.updated_at;
      `, [
        boardId,
        JSON.stringify(tasks),
        JSON.stringify(settings),
        activeTaskId,
        updatedAt,
      ]);
      return { id: boardId, tasks, settings, activeTaskId, updatedAt };
    } catch (err) {
      console.error('[Database] PostgreSQL saveBoard error:', err.message);
    }
  }

  // Fallback to file storage
  ensureFileStore();
  const entry = {
    id: boardId,
    tasks,
    settings,
    activeTaskId,
    updatedAt,
  };
  fileBoardsCache[boardId] = entry;
  saveFileStore();
  return entry;
}
