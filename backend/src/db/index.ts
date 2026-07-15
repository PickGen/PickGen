import { config } from '../config.js';

/**
 * Dual database backend:
 *  - No DATABASE_URL  → better-sqlite3 (local dev, zero-config).
 *  - DATABASE_URL set → Postgres via `pg` (production / Neon).
 *
 * Repositories use a single async API (dbGet/dbAll/dbRun) and write SQL with
 * `$1, $2, …` placeholders. For SQLite these are converted to positional `?`.
 */

export const usingPostgres = !!config.databaseUrl;

// ── Row types (shared) ──────────────────────────────────────────────
export type UserRow = {
  id: string;
  email: string;
  credits: number;
  plan: string;
  created_at: string;
};

export type GenerationRow = {
  id: string;
  user_id: string;
  prompt: string;
  final_prompt: string | null;
  mode: string;
  style: string;
  format: string;
  seed: number | null;
  image_url: string;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  provider: string;
  amount: number;
  credits: number;
  type: string;
  status: string;
  external_id: string | null;
  created_at: string;
};

// ── Backend-specific handles ────────────────────────────────────────
type SqliteModule = typeof import('better-sqlite3');
let sqliteDb: import('better-sqlite3').Database | null = null;
let pgPool: import('pg').Pool | null = null;

function toSqlitePlaceholders(sql: string): string {
  // $1, $2 … → ? (positional; params array must be in $-order)
  return sql.replace(/\$\d+/g, '?');
}

// ── Public async API ────────────────────────────────────────────────
export async function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (pgPool) {
    const res = await pgPool.query(sql, params);
    return res.rows as T[];
  }
  const stmt = sqliteDb!.prepare(toSqlitePlaceholders(sql));
  return stmt.all(...params) as T[];
}

export async function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  if (pgPool) {
    const res = await pgPool.query(sql, params);
    return (res.rows[0] as T) ?? undefined;
  }
  const stmt = sqliteDb!.prepare(toSqlitePlaceholders(sql));
  return (stmt.get(...params) as T) ?? undefined;
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  if (pgPool) {
    const res = await pgPool.query(sql, params);
    return { changes: res.rowCount ?? 0 };
  }
  const info = sqliteDb!.prepare(toSqlitePlaceholders(sql)).run(...params);
  return { changes: info.changes };
}

// ── Schema ──────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  credits      INTEGER NOT NULL DEFAULT 0,
  plan         TEXT NOT NULL DEFAULT 'free',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt       TEXT NOT NULL,
  final_prompt TEXT,
  mode         TEXT NOT NULL,
  style        TEXT NOT NULL,
  format       TEXT NOT NULL,
  seed         INTEGER,
  image_url    TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  amount       REAL NOT NULL,
  credits      INTEGER NOT NULL DEFAULT 0,
  type         TEXT NOT NULL,
  status       TEXT NOT NULL,
  external_id  TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
`;

export async function initDb(): Promise<void> {
  if (usingPostgres) {
    const { Pool } = await import('pg');
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      // Neon and most managed Postgres require TLS
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
    await pgPool.query(SCHEMA);
    console.log('DB: Postgres (DATABASE_URL) connected');
  } else {
    const { mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');
    const Database = (await import('better-sqlite3')).default as unknown as SqliteModule;
    mkdirSync(dirname(config.dbPath), { recursive: true });
    sqliteDb = new (Database as unknown as { new (path: string): import('better-sqlite3').Database })(
      config.dbPath,
    );
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.exec(SCHEMA);
    console.log(`DB: SQLite (${config.dbPath})`);
  }
}
