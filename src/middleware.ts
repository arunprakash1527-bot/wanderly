import { NextResponse, type NextRequest } from 'next/server';

// Lightweight, Edge-safe auth gate: redirect to /signin when there's no session
// cookie present. Real validation happens server-side in currentUser() /
// requireUserId(). We deliberately DON'T import next-auth here — doing so pulls
// `jose` into the Edge runtime and triggers CompressionStream/DecompressionStream
// warnings (and bloats the Edge bundle). A coarse cookie check is enough to gate
// pages; the server still verifies the JWT for every request.
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token');

  if (!hasSession) {
    const url = new URL('/signin', req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Gate pages only. API routes enforce auth themselves (and return JSON 401s),
// so they're excluded here to avoid redirecting API calls to an HTML page.
export const config = {
  matcher: ['/((?!api|signin|_next/static|_next/image|favicon.ico).*)'],
};
