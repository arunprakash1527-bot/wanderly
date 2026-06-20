import { getDb } from './db';
import type {
  Category,
  Subcategory,
  Question,
  QuizSession,
  Attempt,
  Option,
} from './types';

// Query helpers. Keep raw SQL here; API routes and server components call these.

export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}

export function getCategories(): Category[] {
  return getDb().prepare('SELECT * FROM categories ORDER BY id').all() as Category[];
}

export function getCategoriesWithSubs(): CategoryWithSubs[] {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories ORDER BY id').all() as Category[];
  const subs = db.prepare('SELECT * FROM subcategories ORDER BY id').all() as Subcategory[];
  return cats.map((c) => ({
    ...c,
    subcategories: subs.filter((s) => s.category_id === c.id),
  }));
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug) as
    | Category
    | undefined;
}

export function getSubcategoryBySlug(slug: string): Subcategory | undefined {
  return getDb().prepare('SELECT * FROM subcategories WHERE slug = ?').get(slug) as
    | Subcategory
    | undefined;
}

export function getQuestionById(id: number): Question | undefined {
  return getDb().prepare('SELECT * FROM questions WHERE id = ?').get(id) as
    | Question
    | undefined;
}

export function getQuestionsByIds(ids: number[]): Question[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
    .all(...ids) as Question[];
  // Preserve the requested order (quiz order matters).
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Question[];
}

// Count of quiz-eligible verified PYQs and generated questions per category.
export function bankStats() {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.section,
        SUM(CASE WHEN q.source_type='pyq' AND q.verification_status='verified' THEN 1 ELSE 0 END) AS pyq_verified,
        SUM(CASE WHEN q.source_type='generated' AND q.verification_status!='flagged' THEN 1 ELSE 0 END) AS generated,
        SUM(CASE WHEN q.verification_status='flagged' THEN 1 ELSE 0 END) AS flagged,
        SUM(CASE WHEN q.verification_status='unverified' AND q.correct_option IS NULL THEN 1 ELSE 0 END) AS needs_answer
       FROM categories c
       LEFT JOIN questions q ON q.category_id = c.id
       GROUP BY c.id ORDER BY c.id`
    )
    .all() as Array<
    Category & {
      pyq_verified: number;
      generated: number;
      flagged: number;
      needs_answer: number;
    }
  >;
}

// ---- Quiz sessions & attempts ----

export function createSession(args: {
  mode: 'practice' | 'mock';
  configJson: string;
  questionIds: number[];
}): number {
  const db = getDb();
  const tx = db.transaction(() => {
    const res = db
      .prepare(
        'INSERT INTO quiz_sessions (mode, config_json, total_questions) VALUES (?, ?, ?)'
      )
      .run(args.mode, args.configJson, args.questionIds.length);
    const sessionId = res.lastInsertRowid as number;
    const insAttempt = db.prepare(
      'INSERT INTO attempts (session_id, question_id) VALUES (?, ?)'
    );
    for (const qid of args.questionIds) insAttempt.run(sessionId, qid);
    return sessionId;
  });
  return tx();
}

export function getSession(id: number): QuizSession | undefined {
  return getDb().prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(id) as
    | QuizSession
    | undefined;
}

export function getSessionAttempts(sessionId: number): Attempt[] {
  return getDb()
    .prepare('SELECT * FROM attempts WHERE session_id = ? ORDER BY id')
    .all(sessionId) as Attempt[];
}

export interface SessionQuestion extends Question {
  attempt_id: number;
  chosen_option: Option | null;
  attempt_is_correct: number | null;
  time_spent_seconds: number | null;
  user_flagged: number;
  category_name: string;
  subcategory_name: string | null;
}

// Joined view of a session's questions in order, with the current attempt state.
export function getSessionQuestions(sessionId: number): SessionQuestion[] {
  return getDb()
    .prepare(
      `SELECT q.*, a.id AS attempt_id, a.chosen_option,
              a.is_correct AS attempt_is_correct, a.time_spent_seconds, a.user_flagged,
              c.name AS category_name, sc.name AS subcategory_name
       FROM attempts a
       JOIN questions q ON q.id = a.question_id
       JOIN categories c ON c.id = q.category_id
       LEFT JOIN subcategories sc ON sc.id = q.subcategory_id
       WHERE a.session_id = ?
       ORDER BY a.id`
    )
    .all(sessionId) as SessionQuestion[];
}

export function listSessions(): Array<QuizSession & { accuracy: number | null }> {
  const rows = getDb()
    .prepare('SELECT * FROM quiz_sessions ORDER BY started_at DESC')
    .all() as QuizSession[];
  return rows.map((s) => ({
    ...s,
    accuracy:
      s.correct_count != null && s.total_questions > 0
        ? Math.round((s.correct_count / s.total_questions) * 100)
        : null,
  }));
}

export function flagQuestion(questionId: number, attemptId: number) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('UPDATE attempts SET user_flagged = 1 WHERE id = ?').run(attemptId);
    db.prepare(
      "UPDATE questions SET verification_status = 'flagged' WHERE id = ?"
    ).run(questionId);
  });
  tx();
}

export function getFlaggedQuestions(): Array<Question & { category_name: string }> {
  return getDb()
    .prepare(
      `SELECT q.*, c.name AS category_name FROM questions q
       JOIN categories c ON c.id = q.category_id
       WHERE q.verification_status = 'flagged' ORDER BY q.id DESC`
    )
    .all() as Array<Question & { category_name: string }>;
}

export function setExplanation(questionId: number, explanation: string) {
  getDb()
    .prepare('UPDATE questions SET explanation = ? WHERE id = ?')
    .run(explanation, questionId);
}

export function deleteQuestion(questionId: number) {
  getDb().prepare('DELETE FROM questions WHERE id = ?').run(questionId);
}

export function updateQuestionVerification(
  questionId: number,
  status: 'unverified' | 'verified' | 'flagged'
) {
  getDb()
    .prepare('UPDATE questions SET verification_status = ? WHERE id = ?')
    .run(status, questionId);
}
