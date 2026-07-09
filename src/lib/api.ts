import { NextResponse } from 'next/server';

// Shared helpers for route handlers. All DB-touching routes run on Node.
export const runtime = 'nodejs';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unexpected error';
  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }
  // 503 hint when the key is missing so the UI can guide the owner.
  const status = /ANTHROPIC_API_KEY/.test(message) ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}
