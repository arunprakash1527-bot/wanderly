'use client';

import { useState } from 'react';
import { convertBank, type BankItem } from '@/lib/importbank';

interface Cat {
  slug: string;
  name: string;
}

// Save in batches so a large bank never trips the request-size / time limits.
const BATCH = 150;

export default function ImportBank({ categories }: { categories: Cat[] }) {
  const [text, setText] = useState('');
  const [defaultSlug, setDefaultSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File) {
    setError(null);
    setMsg(null);
    try {
      const content = await file.text();
      setText(content);
      setMsg(`Loaded ${file.name} (${Math.round(file.size / 1024)} KB). Click Import to continue.`);
    } catch {
      setError('Could not read that file.');
    }
  }

  async function run() {
    setError(null);
    setMsg(null);

    let items: BankItem[];
    try {
      const parsed = JSON.parse(text);
      items = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(items)) throw new Error();
    } catch {
      setError('That doesn’t look like a JSON array of questions. Paste the file contents or choose the .json file.');
      return;
    }

    const { questions, total, skipped, unmappedTopics, byCategory } = convertBank(
      items,
      defaultSlug || null
    );
    if (questions.length === 0) {
      setError(
        defaultSlug
          ? 'No usable questions found (each needs a stem and four options).'
          : 'None of the topics mapped to a category. Pick a “default category” below and try again.'
      );
      return;
    }

    setBusy(true);
    try {
      let saved = 0;
      for (let i = 0; i < questions.length; i += BATCH) {
        const slice = questions.slice(i, i + BATCH);
        const res = await fetch('/api/ingest/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ questions: slice }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        saved += data.saved ?? slice.length;
      }
      const breakdown = Object.entries(byCategory)
        .map(([slug, n]) => `${categories.find((c) => c.slug === slug)?.name || slug}: ${n}`)
        .join(' · ');
      setMsg(
        `Imported ${saved} of ${total} questions as style references.\n${breakdown}` +
          (skipped ? `\nSkipped ${skipped} (missing stem/options${defaultSlug ? '' : ' or unmapped topic'}).` : '') +
          (unmappedTopics.length
            ? `\nUnmapped topics sent to default: ${unmappedTopics.join(', ')}`
            : '')
      );
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <h2 className="font-semibold">Import an extracted question bank (JSON)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Already pulled the questions out of a paper into JSON? Import them here. They become{' '}
          <strong>style references</strong> — the app studies their format and difficulty to
          generate fresh questions, and never repeats them verbatim.
        </p>
      </div>

      <div>
        <label className="label">Upload .json</label>
        <input
          type="file"
          accept="application/json,.json"
          className="text-sm"
          onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
        />
      </div>

      <div>
        <label className="label">…or paste the JSON</label>
        <textarea
          className="input min-h-[120px] font-mono text-[12px]"
          placeholder='[ { "year": 2021, "topic": "Polity", "stem": "...", "options": ["...","...","...","...","Answer not known"], "correct_answer": "B" }, ... ]'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Default category (for unmapped topics)</label>
          <select
            className="input w-64"
            value={defaultSlug}
            onChange={(e) => setDefaultSlug(e.target.value)}
          >
            <option value="">Skip questions whose topic doesn’t map</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={run} disabled={busy || !text.trim()}>
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {msg && (
        <div className="whitespace-pre-line rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}
    </div>
  );
}
