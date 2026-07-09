'use client';

import { useMemo, useState } from 'react';
import type { ExtractedQuestion } from '@/lib/types';

interface Cat {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
}

export default function IngestForm({ categories }: { categories: Cat[] }) {
  const [rows, setRows] = useState<ExtractedQuestion[]>([]);
  const [busy, setBusy] = useState<'idle' | 'extracting' | 'saving'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subsByCat = useMemo(() => {
    const m = new Map<string, { slug: string; name: string }[]>();
    for (const c of categories) m.set(c.slug, c.subcategories);
    return m;
  }, [categories]);

  async function extract(form: HTMLFormElement) {
    setError(null);
    setMsg(null);
    const fd = new FormData(form);
    // Vercel rejects request bodies over ~4.5 MB before the function runs.
    const MAX = 4 * 1024 * 1024;
    const paper = fd.get('paper') as File | null;
    const key = fd.get('answerKey') as File | null;
    if ((paper?.size || 0) + (key?.size || 0) > MAX) {
      setError(
        'The PDF(s) total over 4 MB, which free hosting rejects on upload. Try a smaller/un-scanned PDF — or, if you just want practice questions in this style, paste the text on the Sources page instead (no size limit).'
      );
      return;
    }
    setBusy('extracting');
    try {
      const res = await fetch('/api/ingest/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setRows(data.questions);
      setMsg(`Extracted ${data.count} question(s). Review and correct below, then save.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy('idle');
    }
  }

  function update(i: number, patch: Partial<ExtractedQuestion>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    setBusy('saving');
    try {
      const res = await fetch('/api/ingest/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questions: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(
        `Saved ${data.saved} question(s) — ${data.unverified} need an answer before they appear in quizzes${
          data.skipped ? `, ${data.skipped} skipped` : ''
        }.`
      );
      setRows([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy('idle');
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          extract(e.currentTarget);
        }}
      >
        <div>
          <label className="label">Question paper (PDF)</label>
          <input type="file" name="paper" accept="application/pdf" required className="text-sm" />
        </div>
        <div>
          <label className="label">Answer key (PDF, optional)</label>
          <input type="file" name="answerKey" accept="application/pdf" className="text-sm" />
        </div>
        <div>
          <label className="label">Year (optional)</label>
          <input type="number" name="year" placeholder="2023" className="input w-28" />
        </div>
        <button className="btn-primary" disabled={busy !== 'idle'}>
          {busy === 'extracting' ? 'Extracting…' : 'Extract questions'}
        </button>
      </form>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Review ({rows.length})</h2>
            <button className="btn-primary" onClick={save} disabled={busy !== 'idle'}>
              {busy === 'saving' ? 'Saving…' : `Save ${rows.length} to bank`}
            </button>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="card space-y-2 p-4">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-ink-faint">#{i + 1}</span>
                <textarea
                  className="input min-h-[48px] flex-1"
                  value={r.stem}
                  onChange={(e) => update(i, { stem: e.target.value })}
                />
                <button className="btn-ghost text-red-600" onClick={() => remove(i)}>
                  Remove
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((k, idx) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-4 text-xs font-semibold text-ink-faint">
                      {'ABCD'[idx]}
                    </span>
                    <input
                      className="input"
                      value={(r[k] as string) || ''}
                      onChange={(e) => update(i, { [k]: e.target.value } as Partial<ExtractedQuestion>)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Field label="Answer">
                  <select
                    className="input w-24"
                    value={r.correct_option || ''}
                    onChange={(e) =>
                      update(i, {
                        correct_option: (e.target.value || null) as ExtractedQuestion['correct_option'],
                      })
                    }
                  >
                    <option value="">— none —</option>
                    {['A', 'B', 'C', 'D'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    className="input w-56"
                    value={r.suggested_category || ''}
                    onChange={(e) =>
                      update(i, { suggested_category: e.target.value || null, suggested_subcategory: null })
                    }
                  >
                    <option value="">— pick —</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Subcategory">
                  <select
                    className="input w-48"
                    value={r.suggested_subcategory || ''}
                    onChange={(e) => update(i, { suggested_subcategory: e.target.value || null })}
                  >
                    <option value="">— none —</option>
                    {(subsByCat.get(r.suggested_category || '') || []).map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select
                    className="input w-32"
                    value={r.suggested_difficulty || 'medium'}
                    onChange={(e) =>
                      update(i, {
                        suggested_difficulty: e.target.value as ExtractedQuestion['suggested_difficulty'],
                      })
                    }
                  >
                    {['easy', 'medium', 'hard'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Year">
                  <input
                    type="number"
                    className="input w-24"
                    value={r.year ?? ''}
                    onChange={(e) => update(i, { year: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </Field>
              </div>
              {!r.correct_option && (
                <p className="text-xs text-amber-600">
                  No answer set — this will be saved as <em>unverified</em> and excluded from quizzes
                  until you add the correct option.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
