import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { ensureExplanation } from '@/lib/explain';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { questionId } = (await req.json()) as { questionId: number };
    if (!questionId) return fail('Missing questionId');
    const explanation = await ensureExplanation(userId, questionId);
    return ok({ explanation });
  } catch (err) {
    return handleError(err);
  }
}
