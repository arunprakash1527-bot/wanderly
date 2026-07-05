import { all, get, run, batchWrite } from './db';
import type {
  Category,
  Subcategory,
  Microtopic,
  Question,
  QuizSession,
  Attempt,
  Option,
} from './types';

// Query helpers. All async (libSQL) and scoped by user_id where the data is
// user-owned. Categories/subcategories are global (shared taxonomy).

export interface SubcategoryWithMicro extends Subcategory {
  microtopics: Microtopic[];
}
export interface CategoryWithSubs extends Category {
  subcategories: SubcategoryWithMicro[];
}

export async function getCategories(): Promise<Category[]> {
  return all<Category>('SELECT * FROM categories ORDER BY id');
}

export async function getCategoriesWithSubs(): Promise<CategoryWithSubs[]> {
  const cats = await all<Category>('SELECT * FROM categories ORDER BY id');
  const subs = await all<Subcategory>('SELECT * FROM subcategories ORDER BY id');
  const micros = await all<Microtopic>('SELECT * FROM microtopics ORDER BY id');
  return cats.map((c) => ({
    ...c,
    subcategories: subs
      .filter((s) => s.category_id === c.id)
      .map((s) => ({
        ...s,
        microtopics: micros.filter((m) => m.subcategory_id === s.id),
      })),
  }));
}

// Question ids the user has already attempted in OTHER (earlier) sessions, so a
// reused question can be flagged as a "Repeat".
export async function getRepeatedQuestionIds(
  userId: number,
  sessionId: number,
  questionIds: number[]
): Promise<Set<number>> {
  if (questionIds.length === 0) return new Set();
  const placeholders = questionIds.map(() => '?').join(',');
  const rows = await all<{ question_id: number }>(
    `SELECT DISTINCT a.question_id
     FROM attempts a JOIN quiz_sessions s ON s.id = a.session_id
     WHERE s.user_id = ? AND a.session_id <> ? AND a.question_id IN (${placeholders})`,
    [userId, sessionId, ...questionIds]
  );
  return new Set(rows.map((r) => r.question_id));
}

export async function getQuestionById(
  userId: number,
  id: number
): Promise<Question | undefined> {
  return get<Question>('SELECT * FROM questions WHERE id = ? AND user_id = ?', [id, userId]);
}

export interface BankStatRow extends Category {
  pyq_verified: number;
  generated: number;
  flagged: number;
  needs_answer: number;
}

export async function bankStats(userId: number): Promise<BankStatRow[]> {
  return all<BankStatRow>(
    `SELECT c.id, c.name, c.slug, c.section,
       SUM(CASE WHEN q.source_type='pyq' AND q.verification_status='verified' THEN 1 ELSE 0 END) AS pyq_verified,
       SUM(CASE WHEN q.source_type='generated' AND q.verification_status!='flagged' THEN 1 ELSE 0 END) AS generated,
       SUM(CASE WHEN q.verification_status='flagged' THEN 1 ELSE 0 END) AS flagged,
       SUM(CASE WHEN q.verification_status='unverified' AND q.correct_option IS NULL THEN 1 ELSE 0 END) AS needs_answer
     FROM categories c
     LEFT JOIN questions q ON q.category_id = c.id AND q.user_id = ?
     GROUP BY c.id ORDER BY c.id`,
    [userId]
  );
}

// ---- Quiz sessions & attempts ----

export async function createSession(args: {
  userId: number;
  mode: 'practice' | 'mock';
  configJson: string;
  questionIds: number[];
}): Promise<number> {
  const res = await run(
    'INSERT INTO quiz_sessions (user_id, mode, config_json, total_questions) VALUES (?, ?, ?, ?)',
    [args.userId, args.mode, args.configJson, args.questionIds.length]
  );
  const sessionId = res.lastInsertRowid;
  if (args.questionIds.length) {
    await batchWrite(
      args.questionIds.map((qid) => ({
        sql: `INSERT INTO attempts (session_id, question_id, concept_id)
              VALUES (?, ?, (SELECT concept_id FROM questions WHERE id = ?))`,
        args: [sessionId, qid, qid],
      }))
    );
  }
  return sessionId;
}

export async function getSession(
  userId: number,
  id: number
): Promise<QuizSession | undefined> {
  return get<QuizSession>('SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function getSessionAttempts(sessionId: number): Promise<Attempt[]> {
  return all<Attempt>('SELECT * FROM attempts WHERE session_id = ? ORDER BY id', [sessionId]);
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

export async function getSessionQuestions(sessionId: number): Promise<SessionQuestion[]> {
  return all<SessionQuestion>(
    `SELECT q.*, a.id AS attempt_id, a.chosen_option,
            a.is_correct AS attempt_is_correct, a.time_spent_seconds, a.user_flagged,
            c.name AS category_name, sc.name AS subcategory_name
     FROM attempts a
     JOIN questions q ON q.id = a.question_id
     JOIN categories c ON c.id = q.category_id
     LEFT JOIN subcategories sc ON sc.id = q.subcategory_id
     WHERE a.session_id = ?
     ORDER BY a.id`,
    [sessionId]
  );
}

export async function listSessions(
  userId: number
): Promise<Array<QuizSession & { accuracy: number | null }>> {
  const rows = await all<QuizSession>(
    'SELECT * FROM quiz_sessions WHERE user_id = ? ORDER BY started_at DESC',
    [userId]
  );
  return rows.map((s) => ({
    ...s,
    accuracy:
      s.correct_count != null && s.total_questions > 0
        ? Math.round((s.correct_count / s.total_questions) * 100)
        : null,
  }));
}

export async function flagQuestion(
  userId: number,
  questionId: number,
  attemptId: number
): Promise<void> {
  await batchWrite([
    { sql: 'UPDATE attempts SET user_flagged = 1 WHERE id = ?', args: [attemptId] },
    {
      sql: "UPDATE questions SET verification_status = 'flagged' WHERE id = ? AND user_id = ?",
      args: [questionId, userId],
    },
  ]);
}

export async function getFlaggedQuestions(
  userId: number
): Promise<Array<Question & { category_name: string }>> {
  return all<Question & { category_name: string }>(
    `SELECT q.*, c.name AS category_name FROM questions q
     JOIN categories c ON c.id = q.category_id
     WHERE q.user_id = ? AND q.verification_status = 'flagged' ORDER BY q.id DESC`,
    [userId]
  );
}

export async function setExplanation(questionId: number, explanation: string): Promise<void> {
  await run('UPDATE questions SET explanation = ? WHERE id = ?', [explanation, questionId]);
}

export async function deleteQuestion(userId: number, questionId: number): Promise<void> {
  await run('DELETE FROM questions WHERE id = ? AND user_id = ?', [questionId, userId]);
}

export async function updateQuestionVerification(
  userId: number,
  questionId: number,
  status: 'unverified' | 'verified' | 'flagged'
): Promise<void> {
  await run('UPDATE questions SET verification_status = ? WHERE id = ? AND user_id = ?', [
    status,
    questionId,
    userId,
  ]);
}
