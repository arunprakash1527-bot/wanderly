import { auth } from '@/auth';
import { getOrCreateUserId } from './db';

// Server-side helpers to resolve the current signed-in user to an internal id.
// Used by API routes and server components to scope every query per user.

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const id = await getOrCreateUserId(email, session.user?.name ?? null, session.user?.image ?? null);
  return { id, email, name: session.user?.name ?? null, image: session.user?.image ?? null };
}

// Throws a recognizable error that route handlers map to a 401.
export async function requireUserId(): Promise<number> {
  const u = await currentUser();
  if (!u) throw new Error('UNAUTHORIZED');
  return u.id;
}
