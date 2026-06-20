import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { ensureExplanation } from '@/lib/explain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generate (and cache) an explanation for a question on demand — used by the
// results review (Section 10.4).
export async function POST(req: NextRequest) {
  try {
    const { questionId } = (await req.json()) as { questionId: number };
    if (!questionId) return fail('Missing questionId');
    const explanation = await ensureExplanation(questionId);
    return ok({ explanation });
  } catch (err) {
    return handleError(err);
  }
}
