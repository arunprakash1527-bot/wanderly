import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { submitSession, SubmitAnswer } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);
    if (Number.isNaN(sessionId)) return fail('Bad session id');
    const body = (await req.json()) as {
      answers: SubmitAnswer[];
      durationSeconds: number;
    };
    const result = submitSession(sessionId, body.answers || [], body.durationSeconds || 0);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
