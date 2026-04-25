import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/AppShell";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Preferences" />
        <div className="px-6 md:px-10 py-10 text-sm text-fg-muted">Sign in to set preferences.</div>
      </div>
    );
  }
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    sb.from("preferences").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("profiles").select("base_cv_text, full_name").eq("id", user.id).maybeSingle(),
  ]);
  return (
    <div>
      <PageHeader title="Preferences" subtitle="What you're looking for. Used to filter the board and tailor your applications." />
      <div className="px-6 md:px-10 py-6 max-w-3xl">
        <PreferencesForm
          initialPrefs={prefs}
          initialCv={profile?.base_cv_text ?? ""}
          initialName={profile?.full_name ?? ""}
        />
      </div>
    </div>
  );
}
