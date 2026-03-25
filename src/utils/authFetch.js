// ─── Authenticated fetch wrapper ───
// Adds the Supabase auth token to all API requests
import { supabase } from "../supabaseClient";

/**
 * Wrapper around fetch() that automatically includes the
 * Supabase auth token in the Authorization header.
 * Falls back to a regular fetch if no session is available.
 */
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
