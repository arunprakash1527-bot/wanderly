"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    const sb = getBrowserSupabase();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/jobs` },
    });
    setLoading(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="size-5 text-accent" />
          <span className="font-semibold">Pathway</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-fg-muted mb-6">We'll email you a magic link.</p>

        {sent ? (
          <div className="rounded-2xl border bg-surface p-5 text-sm">
            Check <span className="font-medium">{email}</span> for the link.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <p className="text-xs text-danger">{err}</p>}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
