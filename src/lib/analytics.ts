import { getDb } from './db';

// Analytics + recommendation stats (Section 10.5/10.6).
// Pure DB aggregation; the AI narrative is layered on top in the API route.

export interface AccuracyRow {
  id: number;
  name: string;
  total: number;
  correct: number;
  accuracy: number; // 0..100
}

export interface TrendPoint {
  sessionId: number;
  date: string;
  mode: string;
  accuracy: number;
  scoreMarks: number;
}

export interface AnalyticsFilter {
  from?: string; // ISO date
  to?: string;
  mode?: 'practice' | 'mock';
}

function buildSessionFilter(filter: AnalyticsFilter): { clause: string; params: unknown[] } {
  const parts: string[] = ['s.completed_at IS NOT NULL'];
  const params: unknown[] = [];
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

export function accuracyByCategory(filter: AnalyticsFilter = {}): AccuracyRow[] {
  const { clause, params } = buildSessionFilter(filter);
  return getDb()
    .prepare(
      `SELECT c.id, c.name,
              COUNT(*) AS total,
              SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM attempts a
       JOIN quiz_sessions s ON s.id = a.session_id
       JOIN questions q ON q.id = a.question_id
       JOIN categories c ON c.id = q.category_id
       WHERE ${clause} AND a.chosen_option IS NOT NULL
       GROUP BY c.id ORDER BY c.id`
    )
    .all(...params)
    .map((r: any) => ({
      ...r,
      accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0,
    })) as AccuracyRow[];
}

export function accuracyBySubcategory(filter: AnalyticsFilter = {}): AccuracyRow[] {
  const { clause, params } = buildSessionFilter(filter);
  return getDb()
    .prepare(
      `SELECT sc.id, (c.name || ' › ' || sc.name) AS name,
              COUNT(*) AS total,
              SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM attempts a
       JOIN quiz_sessions s ON s.id = a.session_id
       JOIN questions q ON q.id = a.question_id
       JOIN subcategories sc ON sc.id = q.subcategory_id
       JOIN categories c ON c.id = q.category_id
       WHERE ${clause} AND a.chosen_option IS NOT NULL
       GROUP BY sc.id`
    )
    .all(...params)
    .map((r: any) => ({
      ...r,
      accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0,
    }))
    .sort((a: AccuracyRow, b: AccuracyRow) => a.accuracy - b.accuracy) as AccuracyRow[];
}

// Volume per category (includes skipped) — surfaces under-practiced areas.
export function volumeByCategory(filter: AnalyticsFilter = {}): { name: string; total: number }[] {
  const { clause, params } = buildSessionFilter(filter);
  return getDb()
    .prepare(
      `SELECT c.name, COUNT(*) AS total
       FROM attempts a
       JOIN quiz_sessions s ON s.id = a.session_id
       JOIN questions q ON q.id = a.question_id
       JOIN categories c ON c.id = q.category_id
       WHERE ${clause}
       GROUP BY c.id ORDER BY total ASC`
    )
    .all(...params) as { name: string; total: number }[];
}

export function trend(filter: AnalyticsFilter = {}): TrendPoint[] {
  const { clause, params } = buildSessionFilter(filter);
  return getDb()
    .prepare(
      `SELECT s.id AS sessionId, s.started_at AS date, s.mode,
              s.correct_count AS correct, s.total_questions AS total,
              s.score_marks AS scoreMarks
       FROM quiz_sessions s
       WHERE ${clause}
       ORDER BY s.started_at ASC`
    )
    .all(...params)
    .map((r: any) => ({
      sessionId: r.sessionId,
      date: r.date,
      mode: r.mode,
      accuracy: r.total ? Math.round((r.correct / r.total) * 100) : 0,
      scoreMarks: r.scoreMarks ?? 0,
    })) as TrendPoint[];
}

export interface RecommendationStats {
  weak: { name: string; accuracy: number; attempts: number }[];
  strong: { name: string; accuracy: number; attempts: number }[];
  underPracticed: { name: string; attempts: number }[];
  overall: { sessions: number; accuracy: number; totalAttempts: number };
}

const MIN_SAMPLE = 10;

export function recommendationStats(filter: AnalyticsFilter = {}): RecommendationStats {
  const cats = accuracyByCategory(filter);
  const eligible = cats.filter((c) => c.total >= MIN_SAMPLE);

  const byAccAsc = [...eligible].sort((a, b) => a.accuracy - b.accuracy);
  const weak = byAccAsc.slice(0, 3).map((c) => ({
    name: c.name,
    accuracy: c.accuracy,
    attempts: c.total,
  }));
  const strong = [...eligible]
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map((c) => ({ name: c.name, accuracy: c.accuracy, attempts: c.total }));

  const underPracticed = [...cats]
    .sort((a, b) => a.total - b.total)
    .slice(0, 3)
    .map((c) => ({ name: c.name, attempts: c.total }));

  const { clause, params } = buildSessionFilter(filter);
  const overall = getDb()
    .prepare(
      `SELECT COUNT(DISTINCT s.id) AS sessions,
              COUNT(a.id) AS totalAttempts,
              SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM quiz_sessions s
       JOIN attempts a ON a.session_id = s.id
       WHERE ${clause} AND a.chosen_option IS NOT NULL`
    )
    .get(...params) as { sessions: number; totalAttempts: number; correct: number };

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
