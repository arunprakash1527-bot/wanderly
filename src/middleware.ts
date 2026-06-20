export { auth as middleware } from '@/auth';

// Protect all routes except the auth endpoints, the sign-in page, and assets.
// (API routes additionally enforce auth server-side and return JSON 401s.)
export const config = {
  matcher: ['/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)'],
};
