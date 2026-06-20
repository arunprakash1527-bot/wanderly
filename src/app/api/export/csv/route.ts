import { NextRequest } from 'next/server';
import { fail } from '@/lib/api';
import { buildSessionCsv } from '@/lib/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sessionId = parseInt(req.nextUrl.searchParams.get('sessionId') || '', 10);
  if (Number.isNaN(sessionId)) return fail('Bad sessionId');
  const csv = buildSessionCsv(sessionId);
  if (csv == null) return fail('Session not found', 404);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="tnpsc-session-${sessionId}.csv"`,
    },
  });
}
