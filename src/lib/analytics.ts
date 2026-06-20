import { all, get } from './db';

// Analytics + recommendation stats (Section 10.5/10.6), per user. Async.

export interface AccuracyRow {
  id: number;
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface TrendPoint {
  sessionId: number;
  date: string;
  mode: string;
  accuracy: number;
  scoreMarks: number;
}

export interface AnalyticsFilter {
  from?: string;
  to?: string;
  mode?: 'practice' | 'mock';
}

function sessionFilter(userId: number, filter: AnalyticsFilter) {
  const parts: string[] = ['s.user_id = ?', 's.completed_at IS NOT NULL'];
  const params: (string | number)[] = [userId];
  if (filter.from) {
    parts.push('s.started_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    parts.push('s.started_at <= ?');
    params.push(filter.to + ' 23:59:59');
  }
  if (filter.mode) {
    parts.push('s.mode = ?');
    params.push(filter.mode);
  }
  return { clause: parts.join(' AND '), params };
}

export async function accuracyByCategory(
  userId: number,
  filter: AnalyticsFilter = {}
): Promise<AccuracyRow[]> {
  const { clause, params } = sessionFilter(userId, filter);
  const rows = await all<AccuracyRow>(
    `SELECT c.id, c.name, COUNT(*) AS total,
            SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM attempts a
     JOIN quiz_sessions s ON s.id = a.session_id
     JOIN questions q ON q.id = a.question_id
     JOIN categories c ON c.id = q.category_id
     WHERE ${clause} AND a.chosen_option IS NOT NULL
     GROUP BY c.id ORDER BY c.id`,
    params
  );
  return rows.map((r) => ({ ...r, accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0 }));
}

export async function accuracyBySubcategory(
  userId: number,
  filter: AnalyticsFilter = {}
): Promise<AccuracyRow[]> {
  const { clause, params } = sessionFilter(userId, filter);
  const rows = await all<AccuracyRow>(
    `SELECT sc.id, (c.name || ' › ' || sc.name) AS name, COUNT(*) AS total,
            SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM attempts a
     JOIN quiz_sessions s ON s.id = a.session_id
     JOIN questions q ON q.id = a.question_id
     JOIN subcategories sc ON sc.id = q.subcategory_id
     JOIN categories c ON c.id = q.category_id
     WHERE ${clause} AND a.chosen_option IS NOT NULL
     GROUP BY sc.id`,
    params
  );
  return rows
    .map((r) => ({ ...r, accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export async function volumeByCategory(
  userId: number,
  filter: AnalyticsFilter = {}
): Promise<{ name: string; total: number }[]> {
  const { clause, params } = sessionFilter(userId, filter);
  return all<{ name: string; total: number }>(
    `SELECT c.name, COUNT(*) AS total
     FROM attempts a
     JOIN quiz_sessions s ON s.id = a.session_id
     JOIN questions q ON q.id = a.question_id
     JOIN categories c ON c.id = q.category_id
     WHERE ${clause}
     GROUP BY c.id ORDER BY total ASC`,
    params
  );
}

export async function trend(userId: number, filter: AnalyticsFilter = {}): Promise<TrendPoint[]> {
  const { clause, params } = sessionFilter(userId, filter);
  const rows = await all<{
    sessionId: number;
    date: string;
    mode: string;
    correct: number;
    total: number;
    scoreMarks: number;
  }>(
    `SELECT s.id AS sessionId, s.started_at AS date, s.mode,
            s.correct_count AS correct, s.total_questions AS total, s.score_marks AS scoreMarks
     FROM quiz_sessions s WHERE ${clause} ORDER BY s.started_at ASC`,
    params
  );
  return rows.map((r) => ({
    sessionId: r.sessionId,
    date: r.date,
    mode: r.mode,
    accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0,
    scoreMarks: r.scoreMarks ?? 0,
  }));
}

export interface RecommendationStats {
  weak: { name: string; accuracy: number; attempts: number }[];
  strong: { name: string; accuracy: number; attempts: number }[];
  underPracticed: { name: string; attempts: number }[];
  overall: { sessions: number; accuracy: number; totalAttempts: number };
}

const MIN_SAMPLE = 10;

export async function recommendationStats(
  userId: number,
  filter: AnalyticsFilter = {}
): Promise<RecommendationStats> {
  const cats = await accuracyByCategory(userId, filter);
  const eligible = cats.filter((c) => c.total >= MIN_SAMPLE);

  const weak = [...eligible]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((c) => ({ name: c.name, accuracy: c.accuracy, attempts: c.total }));
  const strong = [...eligible]
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map((c) => ({ name: c.name, accuracy: c.accuracy, attempts: c.total }));
  const underPracticed = [...cats]
    .sort((a, b) => a.total - b.total)
    .slice(0, 3)
    .map((c) => ({ name: c.name, attempts: c.total }));

  const { clause, params } = sessionFilter(userId, filter);
  const overall = (await get<{ sessions: number; totalAttempts: number; correct: number }>(
    `SELECT COUNT(DISTINCT s.id) AS sessions, COUNT(a.id) AS totalAttempts,
            SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM quiz_sessions s JOIN attempts a ON a.session_id = s.id
     WHERE ${clause} AND a.chosen_option IS NOT NULL`,
    params
  ))!;

  return {
    weak,
    strong,
    underPracticed,
    overall: {
      sessions: overall.sessions || 0,
      totalAttempts: overall.totalAttempts || 0,
      accuracy: overall.totalAttempts
        ? Math.round((overall.correct / overall.totalAttempts) * 100)
        : 0,
    },
  };
}
