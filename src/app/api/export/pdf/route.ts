import { NextRequest } from 'next/server';
import { fail, handleError } from '@/lib/api';
import { buildSessionPdf } from '@/lib/export';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sessionId = parseInt(req.nextUrl.searchParams.get('sessionId') || '', 10);
    if (Number.isNaN(sessionId)) return fail('Bad sessionId');
    const pdf = await buildSessionPdf(userId, sessionId);
    if (!pdf) return fail('Session not found', 404);
    return new Response(Buffer.from(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="tnpsc-session-${sessionId}.pdf"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
