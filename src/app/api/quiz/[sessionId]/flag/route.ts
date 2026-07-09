import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { flagQuestion } from '@/lib/repo';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { questionId, attemptId } = (await req.json()) as {
      questionId: number;
      attemptId: number;
    };
    if (!questionId || !attemptId) return fail('Missing questionId/attemptId');
    await flagQuestion(userId, questionId, attemptId);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
