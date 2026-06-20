import { getDb } from './db';
import { MARK_PER_CORRECT } from './weights';
import type { Option } from './types';

// Scoring (Section 10.4). 1.5 marks per correct, NO negative marking.

export interface SubmitAnswer {
  attemptId: number;
  chosenOption: Option | null; // null = skipped
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

export function submitSession(
  sessionId: number,
  answers: SubmitAnswer[],
  durationSeconds: number
): ScoredResult {
  const db = getDb();

  const tx = db.transaction(() => {
    const updateAttempt = db.prepare(
      `UPDATE attempts
         SET chosen_option = ?, is_correct = ?, time_spent_seconds = ?
       WHERE id = ? AND session_id = ?`
    );
    const getCorrect = db.prepare(
      `SELECT q.correct_option AS correct FROM attempts a
         JOIN questions q ON q.id = a.question_id
        WHERE a.id = ?`
    );

    for (const ans of answers) {
      const row = getCorrect.get(ans.attemptId) as { correct: Option | null } | undefined;
      const isCorrect =
        ans.chosenOption != null && row?.correct != null && ans.chosenOption === row.correct
          ? 1
          : 0;
      updateAttempt.run(
        ans.chosenOption,
        ans.chosenOption == null ? null : isCorrect,
        ans.timeSpentSeconds ?? null,
        ans.attemptId,
        sessionId
      );
    }

    // Aggregate from the attempts table (source of truth).
    const agg = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
           SUM(CASE WHEN chosen_option IS NULL THEN 1 ELSE 0 END) AS skipped
         FROM attempts WHERE session_id = ?`
      )
      .get(sessionId) as { total: number; correct: number; skipped: number };

    const correct = agg.correct || 0;
    const score = correct * MARK_PER_CORRECT;

    db.prepare(
      `UPDATE quiz_sessions
         SET correct_count = ?, score_marks = ?, completed_at = datetime('now'),
             duration_seconds = ?
       WHERE id = ?`
    ).run(correct, score, durationSeconds, sessionId);

    return {
      sessionId,
      totalQuestions: agg.total,
      correct,
      incorrect: agg.total - correct - (agg.skipped || 0),
      skipped: agg.skipped || 0,
      scoreMarks: score,
      durationSeconds,
    } as ScoredResult;
  });

  return tx();
}
