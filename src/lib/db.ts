import { createClient, type Client, type InValue } from '@libsql/client';
import { TAXONOMY } from './taxonomy';

// ---------------------------------------------------------------------------
// Single point of database access. Uses libSQL so the same code runs against a
// local file in dev (`file:./data/tnpsc.db`) and a hosted Turso database in
// production (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN). All access is async.
// ---------------------------------------------------------------------------

const URL = process.env.TURSO_DATABASE_URL || 'file:./data/tnpsc.db';
const AUTH = process.env.TURSO_AUTH_TOKEN;

// Reserved id for the shared/global reference bank. Real users are AUTOINCREMENT
// ids starting at 1, so 0 can never collide. Questions stored under this id are
// visible to every user as generation exemplars (but never served verbatim).
export const SHARED_USER_ID = 0;

let _client: Client | null = null;
let _ready: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const client = createClient(AUTH ? { url: URL, authToken: AUTH } : { url: URL });
  await migrate(client);
  await seedTaxonomy(client);
  await seedMicrotopics(client);
  return client;
}

// Memoised so migrations run once per server instance.
export async function getDb(): Promise<Client> {
  if (_client) return _client;
  if (!_ready) _ready = connect().then((c) => (_client = c));
  return _ready;
}

// --- thin query helpers (positional `?` args, like the previous layer) -------

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function get<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const rows = await all<T>(sql, args);
  return rows[0];
}

export async function run(
  sql: string,
  args: InValue[] = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  const db = await getDb();
  const res = await db.execute({ sql, args });
  return {
    lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : 0,
    rowsAffected: res.rowsAffected,
  };
}

// Run a set of write statements atomically.
export async function batchWrite(statements: { sql: string; args?: InValue[] }[]): Promise<void> {
  const db = await getDb();
  await db.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'write'
  );
}

async function migrate(db: Client) {
  // libSQL runs one statement per execute; keep them as an ordered list.
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      section TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      UNIQUE (category_id, slug)
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      stem TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT,
      explanation TEXT,
      category_id INTEGER NOT NULL,
      subcategory_id INTEGER,
      difficulty TEXT NOT NULL,
      year INTEGER,
      source_ref TEXT,
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_questions_pick
      ON questions(user_id, category_id, verification_status, source_type)`,
    `CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      config_json TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER,
      score_marks REAL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      duration_seconds INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON quiz_sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      chosen_option TEXT,
      is_correct INTEGER,
      time_spent_seconds INTEGER,
      user_flagged INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id)`,
    `CREATE TABLE IF NOT EXISTS source_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category_id INTEGER,
      file_path TEXT,
      ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS source_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      document_id INTEGER NOT NULL,
      category_id INTEGER,
      chunk_text TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chunks_cat ON source_chunks(user_id, category_id)`,
    `CREATE TABLE IF NOT EXISTS microtopics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcategory_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      UNIQUE (subcategory_id, slug)
    )`,
  ];
  // One network round-trip instead of ~12 sequential ones — this runs on every
  // cold serverless start, so batching it noticeably cuts first-request latency.
  await db.batch(
    statements.map((sql) => ({ sql, args: [] as InValue[] })),
    'write'
  );
  // Third taxonomy level added after launch — add the column to existing tables.
  await ensureColumn(db, 'questions', 'microtopic_id', 'INTEGER');
}

// Add a column only if it's missing (SQLite has no ADD COLUMN IF NOT EXISTS).
async function ensureColumn(db: Client, table: string, col: string, decl: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const has = (info.rows as Row[]).some((r) => String(r.name) === col);
  if (!has) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}

// Seed the micro-topics. Idempotent and independent of seedTaxonomy so it also
// populates databases that were already seeded before this level existed.
async function seedMicrotopics(db: Client) {
  const res = await db.execute('SELECT COUNT(*) AS n FROM microtopics');
  if (Number((res.rows[0] as Row).n) > 0) return;

  const subs = await db.execute(
    `SELECT sc.id AS id, sc.slug AS sub_slug, c.slug AS cat_slug
     FROM subcategories sc JOIN categories c ON c.id = sc.category_id`
  );
  const idByKey = new Map(
    (subs.rows as Row[]).map((r) => [`${r.cat_slug}/${r.sub_slug}`, Number(r.id)])
  );

  const stmts: { sql: string; args: InValue[] }[] = [];
  for (const cat of TAXONOMY) {
    for (const s of cat.subcategories) {
      const subId = idByKey.get(`${cat.slug}/${s.slug}`);
      if (!subId) continue;
      for (const mt of s.micro) {
        stmts.push({
          sql: 'INSERT INTO microtopics (subcategory_id, name, slug) VALUES (?, ?, ?)',
          args: [subId, mt.name, mt.slug],
        });
      }
    }
  }
  if (stmts.length) await db.batch(stmts, 'write');
}

async function seedTaxonomy(db: Client) {
  const res = await db.execute('SELECT COUNT(*) AS n FROM categories');
  if (Number((res.rows[0] as Row).n) > 0) return;

  const stmts: { sql: string; args: InValue[] }[] = [];
  // Insert categories first, then subcategories (resolve ids in a second pass).
  for (const cat of TAXONOMY) {
    await db.execute({
      sql: 'INSERT INTO categories (name, slug, section) VALUES (?, ?, ?)',
      args: [cat.name, cat.slug, cat.section],
    });
  }
  const cats = await db.execute('SELECT id, slug FROM categories');
  const idBySlug = new Map((cats.rows as Row[]).map((r) => [String(r.slug), Number(r.id)]));
  for (const cat of TAXONOMY) {
    const catId = idBySlug.get(cat.slug)!;
    for (const s of cat.subcategories) {
      stmts.push({
        sql: 'INSERT INTO subcategories (category_id, name, slug) VALUES (?, ?, ?)',
        args: [catId, s.name, s.slug],
      });
    }
  }
  if (stmts.length) await db.batch(stmts, 'write');
}

// Resolve (and lazily create) the internal user id for a signed-in email.
// Race-safe: on first login the layout and page both call this concurrently,
// so use INSERT ... ON CONFLICT DO NOTHING and then read the id back.
export async function getOrCreateUserId(
  email: string,
  name: string | null,
  image: string | null
): Promise<number> {
  const existing = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return existing.id;
  await run(
    'INSERT INTO users (email, name, image) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING',
    [email, name, image]
  );
  const row = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
  return row!.id;
}
