import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { getDb } from '@/lib/db';
import { deleteQuestion, updateQuestionVerification } from '@/lib/repo';
import type { Option } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Review flagged (Section 9c): fix (optionally set the correct answer) and
// restore to the bank, or delete.
export async function POST(req: NextRequest) {
  try {
    const { questionId, action, correctOption } = (await req.json()) as {
      questionId: number;
      action: 'verify' | 'delete';
      correctOption?: Option;
    };
    if (!questionId) return fail('Missing questionId');

    if (action === 'delete') {
      deleteQuestion(questionId);
      return ok({ ok: true });
    }
    if (action === 'verify') {
      if (correctOption && ['A', 'B', 'C', 'D'].includes(correctOption)) {
        getDb()
          .prepare('UPDATE questions SET correct_option = ? WHERE id = ?')
          .run(correctOption, questionId);
      }
      // Restore to the bank as verified (owner has reviewed it).
      updateQuestionVerification(questionId, 'verified');
      return ok({ ok: true });
    }
    return fail('Unknown action');
  } catch (err) {
    return handleError(err);
  }
}
