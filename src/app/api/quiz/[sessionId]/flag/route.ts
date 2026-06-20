import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { flagQuestion } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// "Flag as wrong" (Section 9c): marks the attempt and excludes the question
// from future quizzes until reviewed.
export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { questionId, attemptId } = (await req.json()) as {
      questionId: number;
      attemptId: number;
    };
    if (!questionId || !attemptId) return fail('Missing questionId/attemptId');
    flagQuestion(questionId, attemptId);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
