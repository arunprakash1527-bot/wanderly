"use client";
import { useEffect, useState } from "react";
import { X, ExternalLink, Sparkles, FileText, Mail, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Textarea } from "@/components/ui/input";
import type { JobCardData } from "./JobCard";
import { fmtSalary, relativeTime } from "@/lib/utils";
import type { CvFormat, CoverLetterStyle } from "@/lib/types";

interface FullJob extends JobCardData {
  description: string | null;
  years_experience: string | null;
  employment_type: string | null;
}

export function JobDetailDrawer({
  job, onClose, onApplied,
}: { job: FullJob | null; onClose: () => void; onApplied?: () => void }) {
  const [cvFormat, setCvFormat] = useState<CvFormat>("ats_clean");
  const [letterStyle, setLetterStyle] = useState<CoverLetterStyle>("conversational");
  const [tailoring, setTailoring] = useState<"idle" | "cv" | "letter">("idle");
  const [cv, setCv] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setCv(null); setLetter(null); setError(null); }, [job?.id]);

  if (!job) return null;

  async function tailorCv() {
    setTailoring("cv"); setError(null);
    try {
      const r = await fetch("/api/ai/tailor-cv", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job!.id, format: cvFormat }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "tailoring_failed");
      setCv(JSON.stringify(data.cv, null, 2));
    } catch (e) { setError((e as Error).message); }
    finally { setTailoring("idle"); }
  }

  async function generateLetter() {
    setTailoring("letter"); setError(null);
    try {
      const r = await fetch("/api/ai/cover-letter", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job!.id, style: letterStyle }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "letter_failed");
      setLetter(data.letter);
    } catch (e) { setError((e as Error).message); }
    finally { setTailoring("idle"); }
  }

  async function markApplied() {
    await fetch("/api/applications", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: job!.id, status: "applied" }),
    });
    onApplied?.();
  }

  const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-2xl bg-bg border-l shadow-pop overflow-y-auto scrollbar-thin">
        <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{job.title}</h2>
            <p className="text-sm text-fg-muted truncate">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.seniority && <Badge tone="accent">{job.seniority}</Badge>}
              {job.work_model && <Badge tone="muted" className="capitalize">{job.work_model}</Badge>}
              {salary && <Badge tone="success">{salary}</Badge>}
              {job.posted_at && <Badge tone="muted">{relativeTime(job.posted_at)}</Badge>}
              {job.years_experience && <Badge tone="muted">{job.years_experience}</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="size-4" /></Button>
        </header>

        <section className="px-6 py-5 space-y-6">
          {/* AI Tailoring */}
          <div className="rounded-2xl border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-accent" />
              <h3 className="font-medium">Tailor for this role</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>CV format</Label>
                <SegmentedSelect
                  value={cvFormat}
                  onChange={(v) => setCvFormat(v as CvFormat)}
                  options={[
                    { value: "ats_clean", label: "ATS-clean" },
                    { value: "modern", label: "Modern" },
                    { value: "executive", label: "Executive" },
                  ]}
                />
                <Button onClick={tailorCv} disabled={tailoring !== "idle"} className="mt-3 w-full">
                  {tailoring === "cv" ? <><Loader2 className="size-4 animate-spin" />Tailoring…</> :
                   cv ? <><Check className="size-4" />Re-tailor CV</> :
                   <><FileText className="size-4" />Tailor my CV</>}
                </Button>
              </div>
              <div>
                <Label>Cover letter style</Label>
                <SegmentedSelect
                  value={letterStyle}
                  onChange={(v) => setLetterStyle(v as CoverLetterStyle)}
                  options={[
                    { value: "formal", label: "Formal" },
                    { value: "conversational", label: "Conversational" },
                    { value: "narrative", label: "Narrative" },
                  ]}
                />
                <Button onClick={generateLetter} variant="secondary" disabled={tailoring !== "idle"} className="mt-3 w-full">
                  {tailoring === "letter" ? <><Loader2 className="size-4 animate-spin" />Drafting…</> :
                   letter ? <><Check className="size-4" />Re-generate letter</> :
                   <><Mail className="size-4" />Draft cover letter</>}
                </Button>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-danger">
                {error === "no_base_cv" ? "Upload your CV in Preferences first." :
                 error === "limit_reached" ? "You've hit your monthly AI tailoring limit. Upgrade to Pro for unlimited." :
                 error}
              </p>
            )}

            {cv && (
              <div className="mt-4">
                <Label>Tailored CV (preview)</Label>
                <Textarea readOnly value={cv} className="font-mono text-xs min-h-[200px]" />
              </div>
            )}
            {letter && (
              <div className="mt-4">
                <Label>Cover letter</Label>
                <Textarea readOnly value={letter} className="min-h-[180px]" />
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-medium mb-2">About the role</h3>
              <p className="text-sm whitespace-pre-wrap text-fg-muted leading-relaxed">{job.description}</p>
            </div>
          )}
        </section>

        <footer className="sticky bottom-0 bg-bg/95 backdrop-blur border-t px-6 py-4 flex items-center gap-3">
          <a href={job.canonical_url} target="_blank" rel="noreferrer" onClick={markApplied} className="flex-1">
            <Button className="w-full" size="lg">
              <ExternalLink className="size-4" />Apply on {hostFromUrl(job.canonical_url)}
            </Button>
          </a>
          <Button
            variant="secondary" size="lg"
            onClick={async () => {
              await fetch("/api/applications", {
                method: "POST", headers: { "content-type": "application/json" },
                body: JSON.stringify({ jobId: job.id, status: "saved" }),
              });
              onApplied?.();
            }}
          >
            Save
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function hostFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "site"; }
}

function SegmentedSelect<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex w-full p-1 bg-muted rounded-xl">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            "flex-1 h-8 text-xs rounded-lg transition-colors " +
            (value === o.value ? "bg-bg shadow-card font-medium" : "text-fg-muted hover:text-fg")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
