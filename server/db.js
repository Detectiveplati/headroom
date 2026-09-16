import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

// Check if PostgreSQL is available via Railway DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'boards.json');

// Memory cache for file-based fallback
let fileStoreCache = null;

// ==================== CRYPTO HELPERS ====================
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ==================== DATABASE INITIALIZATION ====================
if (DATABASE_URL) {
  console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' && !DATABASE_URL.includes('localhost') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  // Initialize tables
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boards (
      id VARCHAR(255) PRIMARY KEY,
      owner_id VARCHAR(255),
      tasks JSONB NOT NULL,
      settings JSONB NOT NULL,
      active_task_id VARCHAR(255),
      updated_at BIGINT NOT NULL
    );
  `).then(() => {
    console.log('[Database] PostgreSQL tables (users, sessions, boards) initialized successfully.');
  }).catch((err) => {
    console.error('[Database] Failed to initialize PostgreSQL tables, falling back to local file storage:', err.message);
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
    fs.writeFileSync(JSON_FILE, JSON.stringify({ boards: {}, users: {}, sessions: {} }), 'utf-8');
  }
  if (fileStoreCache === null) {
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      // Migrate legacy board store format if needed
      if (parsed && !parsed.boards && !parsed.users) {
        fileStoreCache = { boards: parsed, users: {}, sessions: {} };
      } else {
        fileStoreCache = { boards: {}, users: {}, sessions: {}, ...parsed };
      }
    } catch {
      fileStoreCache = { boards: {}, users: {}, sessions: {} };
    }
  }
}

function saveFileStore() {
  ensureFileStore();
  const tmpFile = `${JSON_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(fileStoreCache, null, 2), 'utf-8');
  fs.renameSync(tmpFile, JSON_FILE);
}

// ==================== AUTH METHODS ====================
export async function registerUser(username, password) {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || cleanUser.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const token = generateToken();
  const now = Date.now();

  if (pool) {
    try {
      const checkRes = await pool.query('SELECT id FROM users WHERE username = $1', [cleanUser]);
      if (checkRes.rows.length > 0) {
        throw new Error('Username is already taken');
      }

      await pool.query(
        'INSERT INTO users (id, username, password_hash, salt, created_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, cleanUser, passwordHash, salt, now]
      );

      await pool.query(
        'INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)',
        [token, userId, now]
      );

      return { user: { id: userId, username: cleanUser }, token };
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('already taken')) {
        throw new Error('Username is already taken');
      }
      throw err;
    }
  }

  // Local file fallback
  ensureFileStore();
  const existing = Object.values(fileStoreCache.users).find((u) => u.username === cleanUser);
  if (existing) {
    throw new Error('Username is already taken');
  }

  const userRecord = {
    id: userId,
    username: cleanUser,
    password_hash: passwordHash,
    salt,
    created_at: now,
  };

  fileStoreCache.users[userId] = userRecord;
  fileStoreCache.sessions[token] = { token, user_id: userId, created_at: now };
  saveFileStore();

  return { user: { id: userId, username: cleanUser }, token };
}

export async function loginUser(username, password) {
  const cleanUser = username.trim().toLowerCase();

  if (pool) {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [cleanUser]);
    if (res.rows.length === 0) {
      throw new Error('Invalid username or password');
    }
    const user = res.rows[0];
    const hash = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      throw new Error('Invalid username or password');
    }

    const token = generateToken();
    await pool.query(
      'INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)',
      [token, user.id, Date.now()]
    );

    return { user: { id: user.id, username: user.username }, token };
  }

  // Local file fallback
  ensureFileStore();
  const user = Object.values(fileStoreCache.users).find((u) => u.username === cleanUser);
  if (!user) {
    throw new Error('Invalid username or password');
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    throw new Error('Invalid username or password');
  }

  const token = generateToken();
  fileStoreCache.sessions[token] = { token, user_id: user.id, created_at: Date.now() };
  saveFileStore();

  return { user: { id: user.id, username: user.username }, token };
}

export async function getUserByToken(token) {
  if (!token) return null;

  if (pool) {
    const res = await pool.query(`
      SELECT u.id, u.username, u.created_at 
      FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = $1
    `, [token]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    return null;
  }

  // Local file fallback
  ensureFileStore();
  const session = fileStoreCache.sessions[token];
  if (!session) return null;
  const user = fileStoreCache.users[session.user_id];
  if (!user) return null;
  return { id: user.id, username: user.username, created_at: user.created_at };
}

export async function deleteSession(token) {
  if (!token) return;

  if (pool) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    return;
  }

  ensureFileStore();
  delete fileStoreCache.sessions[token];
  saveFileStore();
}

// ==================== BOARD METHODS ====================
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
  return fileStoreCache.boards[boardId] || null;
}

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
  fileStoreCache.boards[boardId] = entry;
  saveFileStore();
  return entry;
}
