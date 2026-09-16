import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // .env may not exist in production or container environments
}

const { Pool } = pg;

// Check if PostgreSQL is available via Railway or generic DATABASE_URL
const DATABASE_URL = 
  process.env.DATABASE_URL || 
  process.env.DATABASE_PRIVATE_URL || 
  process.env.DATABASE_PUBLIC_URL || 
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL;

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

export function isPostgresConnected() {
  return pool !== null;
}

// ==================== DATABASE INITIALIZATION ====================
function determineSsl(url) {
  if (!url) return false;
  // Railway internal network (.railway.internal) and localhost do NOT support/require SSL
  const isInternal = 
    url.includes('railway.internal') || 
    url.includes('localhost') || 
    url.includes('127.0.0.1') || 
    url.includes('sslmode=disable');
  
  if (isInternal) return false;
  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

const TABLE_INIT_SQL = `
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

  CREATE TABLE IF NOT EXISTS expense_rules (
    pattern VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    created_at BIGINT NOT NULL
  );
`;

if (DATABASE_URL) {
  console.log('[Database] DATABASE_URL detected. Connecting to PostgreSQL...');
  const initialSsl = determineSsl(DATABASE_URL);

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: initialSsl,
  });

  pool.query(TABLE_INIT_SQL)
    .then(() => {
      console.log('[Database] ✅ PostgreSQL tables (users, sessions, boards) initialized successfully.');
    })
    .catch(async (err) => {
      // If SSL failed (common on Railway private networking), retry once without SSL
      if (initialSsl && (err.message.includes('SSL') || err.message.includes('ssl') || err.code === 'ECONNRESET')) {
        console.warn('[Database] SSL handshake failed, retrying connection with ssl: false...');
        try {
          await pool.end().catch(() => {});
          pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: false,
          });
          await pool.query(TABLE_INIT_SQL);
          console.log('[Database] ✅ PostgreSQL tables initialized successfully (ssl: false).');
          return;
        } catch (retryErr) {
          console.error('[Database] Failed to connect to PostgreSQL without SSL:', retryErr.message);
        }
      }
      console.error('[Database] ❌ Failed to initialize PostgreSQL tables, falling back to local file storage:', err.message);
      pool = null;
    });
} else {
  console.warn('[Database] ⚠️ No DATABASE_URL found. Using local JSON store at data/boards.json');
  console.warn('[Database] ⚠️ Note: On cloud platforms like Railway, container disks are ephemeral. Attach a PostgreSQL database to persist users across git pushes.');
}

// Local file storage helpers
function ensureFileStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_FILE)) {
    fs.writeFileSync(JSON_FILE, JSON.stringify({ boards: {}, users: {}, sessions: {}, categoryRules: {} }), 'utf-8');
  }
  if (fileStoreCache === null) {
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      // Migrate legacy board store format if needed
      if (parsed && !parsed.boards && !parsed.users) {
        fileStoreCache = { boards: parsed, users: {}, sessions: {}, categoryRules: {} };
      } else {
        fileStoreCache = { boards: {}, users: {}, sessions: {}, categoryRules: {}, ...parsed };
      }
    } catch {
      fileStoreCache = { boards: {}, users: {}, sessions: {}, categoryRules: {} };
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

// ==================== EXPENSE CATEGORY RULES METHODS ====================
export async function getCategoryRules() {
  if (pool) {
    try {
      const res = await pool.query('SELECT pattern, category FROM expense_rules');
      const rules = {};
      for (const row of res.rows) {
        rules[row.pattern] = row.category;
      }
      return rules;
    } catch (err) {
      console.error('[Database] PostgreSQL getCategoryRules error:', err.message);
    }
  }

  ensureFileStore();
  return fileStoreCache.categoryRules || {};
}

export async function saveCategoryRule(pattern, category) {
  const cleanPattern = String(pattern || '').trim().toUpperCase();
  const cleanCat = String(category || '').trim();
  if (!cleanPattern || !cleanCat) return;

  const now = Date.now();
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO expense_rules (pattern, category, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (pattern) DO UPDATE SET category = EXCLUDED.category;
      `, [cleanPattern, cleanCat, now]);
      return { pattern: cleanPattern, category: cleanCat };
    } catch (err) {
      console.error('[Database] PostgreSQL saveCategoryRule error:', err.message);
    }
  }

  ensureFileStore();
  if (!fileStoreCache.categoryRules) {
    fileStoreCache.categoryRules = {};
  }
  fileStoreCache.categoryRules[cleanPattern] = cleanCat;
  saveFileStore();
  return { pattern: cleanPattern, category: cleanCat };
}

export async function saveCategoryRulesBatch(rulesObj = {}) {
  const entries = Object.entries(rulesObj);
  if (entries.length === 0) return await getCategoryRules();

  const now = Date.now();
  if (pool) {
    try {
      for (const [pattern, category] of entries) {
        const cleanPattern = String(pattern || '').trim().toUpperCase();
        const cleanCat = String(category || '').trim();
        if (!cleanPattern || !cleanCat) continue;
        await pool.query(`
          INSERT INTO expense_rules (pattern, category, created_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (pattern) DO UPDATE SET category = EXCLUDED.category;
        `, [cleanPattern, cleanCat, now]);
      }
      return await getCategoryRules();
    } catch (err) {
      console.error('[Database] PostgreSQL saveCategoryRulesBatch error:', err.message);
    }
  }

  ensureFileStore();
  if (!fileStoreCache.categoryRules) {
    fileStoreCache.categoryRules = {};
  }
  for (const [pattern, category] of entries) {
    const cleanPattern = String(pattern || '').trim().toUpperCase();
    const cleanCat = String(category || '').trim();
    if (cleanPattern && cleanCat) {
      fileStoreCache.categoryRules[cleanPattern] = cleanCat;
    }
  }
  saveFileStore();
  return fileStoreCache.categoryRules;
}

