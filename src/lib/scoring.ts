import { get, run, batchWrite } from './db';
import { MARK_PER_CORRECT } from './weights';
import type { Option } from './types';

// Scoring (Section 10.4). 1.5 marks per correct, NO negative marking. Async.

export interface SubmitAnswer {
  attemptId: number;
  chosenOption: Option | null;
  timeSpentSeconds?: number;
}

export interface ScoredResult {
  sessionId: number;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  skipped: number;
  scoreMarks: number;
  durationSeconds: number;
}

export async function submitSession(
  userId: number,
  sessionId: number,
  answers: SubmitAnswer[],
  durationSeconds: number
): Promise<ScoredResult> {
  // Ownership guard.
  const owns = await get<{ id: number }>(
    'SELECT id FROM quiz_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  if (!owns) throw new Error('UNAUTHORIZED');

  // Resolve correctness for each answered attempt.
  const writes: { sql: string; args: (string | number | null)[] }[] = [];
  for (const ans of answers) {
    const row = await get<{ correct: Option | null }>(
      `SELECT q.correct_option AS correct FROM attempts a
         JOIN questions q ON q.id = a.question_id
        WHERE a.id = ? AND a.session_id = ?`,
      [ans.attemptId, sessionId]
    );
    const isCorrect =
      ans.chosenOption != null && row?.correct != null && ans.chosenOption === row.correct ? 1 : 0;
    writes.push({
      sql: `UPDATE attempts SET chosen_option = ?, is_correct = ?, time_spent_seconds = ?
            WHERE id = ? AND session_id = ?`,
      args: [
        ans.chosenOption,
        ans.chosenOption == null ? null : isCorrect,
        ans.timeSpentSeconds ?? null,
        ans.attemptId,
        sessionId,
      ],
    });
  }
  if (writes.length) await batchWrite(writes);

  const agg = (await get<{ total: number; correct: number; skipped: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            SUM(CASE WHEN chosen_option IS NULL THEN 1 ELSE 0 END) AS skipped
     FROM attempts WHERE session_id = ?`,
    [sessionId]
  ))!;

  const correct = agg.correct || 0;
  const score = correct * MARK_PER_CORRECT;

  await run(
    `UPDATE quiz_sessions
       SET correct_count = ?, score_marks = ?, completed_at = datetime('now'), duration_seconds = ?
     WHERE id = ?`,
    [correct, score, durationSeconds, sessionId]
  );

  return {
    sessionId,
    totalQuestions: agg.total,
    correct,
    incorrect: agg.total - correct - (agg.skipped || 0),
    skipped: agg.skipped || 0,
    scoreMarks: score,
    durationSeconds,
  };
}
