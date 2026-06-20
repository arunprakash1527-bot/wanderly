import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Auth.js v5 with Google sign-in. JWT sessions (no DB adapter needed) — we map
// the signed-in email to an internal user id ourselves (see lib/user.ts), which
// keeps this config edge-safe for middleware (no Node/DB imports here).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: { signIn: '/signin' },
  callbacks: {
    // Gate every page (middleware uses this). API routes also check server-side.
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
