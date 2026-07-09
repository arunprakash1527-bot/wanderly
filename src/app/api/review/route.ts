import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { run } from '@/lib/db';
import { deleteQuestion, updateQuestionVerification } from '@/lib/repo';
import { requireUserId } from '@/lib/user';
import type { Option } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Review flagged (Section 9c): fix (optionally set the answer) + restore, or delete.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { questionId, action, correctOption } = (await req.json()) as {
      questionId: number;
      action: 'verify' | 'delete';
      correctOption?: Option;
    };
    if (!questionId) return fail('Missing questionId');

    if (action === 'delete') {
      await deleteQuestion(userId, questionId);
      return ok({ ok: true });
    }
    if (action === 'verify') {
      if (correctOption && ['A', 'B', 'C', 'D'].includes(correctOption)) {
        await run('UPDATE questions SET correct_option = ? WHERE id = ? AND user_id = ?', [
          correctOption,
          questionId,
          userId,
        ]);
      }
      await updateQuestionVerification(userId, questionId, 'verified');
      return ok({ ok: true });
    }
    return fail('Unknown action');
  } catch (err) {
    return handleError(err);
  }
}
