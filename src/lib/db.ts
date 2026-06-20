import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { TAXONOMY } from './taxonomy';

// ---------------------------------------------------------------------------
// Single point of database access. Everything that touches SQLite goes through
// this module, so swapping better-sqlite3 for a hosted libSQL/Turso client
// later (see Section 5 deployment caveat) is a localized change.
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tnpsc.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  seedTaxonomy(db);

  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      section TEXT NOT NULL CHECK (section IN ('GS','APTITUDE'))
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      UNIQUE (category_id, slug)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK (source_type IN ('pyq','generated')),
      stem TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT CHECK (correct_option IN ('A','B','C','D')),
      explanation TEXT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      subcategory_id INTEGER REFERENCES subcategories(id),
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
      year INTEGER,
      source_ref TEXT,
      verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified','verified','flagged')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_questions_cat ON questions(category_id);
    CREATE INDEX IF NOT EXISTS idx_questions_pick
      ON questions(category_id, verification_status, source_type);

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK (mode IN ('practice','mock')),
      config_json TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER,
      score_marks REAL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      duration_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      chosen_option TEXT CHECK (chosen_option IN ('A','B','C','D')),
      is_correct INTEGER,
      time_spent_seconds INTEGER,
      user_flagged INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);

    CREATE TABLE IF NOT EXISTS source_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      file_path TEXT NOT NULL,
      ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id),
      chunk_text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_cat ON source_chunks(category_id);
  `);
}

function seedTaxonomy(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
  if (count.n > 0) return; // already seeded

  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, section) VALUES (?, ?, ?)'
  );
  const insertSub = db.prepare(
    'INSERT INTO subcategories (category_id, name, slug) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const cat of TAXONOMY) {
      const res = insertCat.run(cat.name, cat.slug, cat.section);
      const catId = res.lastInsertRowid as number;
      for (const s of cat.subcategories) {
        insertSub.run(catId, s.name, s.slug);
      }
    }
  });
  tx();
}

// Convenience accessor used in scripts/tests to (re)initialise explicitly.
export function initDb() {
  return getDb();
}
