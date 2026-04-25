import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export { getServiceSupabase } from "./service";

export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );
}

export async function requireUser() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return { sb, user };
}
