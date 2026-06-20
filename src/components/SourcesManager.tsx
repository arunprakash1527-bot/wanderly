'use client';

import { useState } from 'react';

interface Doc {
  id: number;
  title: string;
  ingested_at: string;
  category_name: string | null;
  chunk_count: number;
}

export default function SourcesManager({
  categories,
  initialDocuments,
}: {
  categories: { slug: string; name: string }[];
  initialDocuments: Doc[];
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vercel rejects request bodies over ~4.5 MB before the function runs, so guard
  // large files client-side and point people at the paste box instead.
  const MAX_FILE_BYTES = 4 * 1024 * 1024;

  async function upload(form: HTMLFormElement) {
    setError(null);
    setMsg(null);

    const fd = new FormData(form);
    const text = ((fd.get('text') as string) || '').trim();
    const file = fd.get('file') as File | null;

    if (!text && (!file || file.size === 0)) {
      setError('Paste your questions in the box, or choose a file.');
      return;
    }
    // When pasting, drop the file so we never send a large body needlessly.
    if (text) fd.delete('file');
    else if (file && file.size > MAX_FILE_BYTES) {
      setError(
        'That file is over 4 MB — Vercel will reject it. Open the PDF, copy the questions, and paste them into the box above instead (that always works).'
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/sources', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMsg(`Added ${data.chunks} reference chunk(s) — new quizzes on this topic will be modelled on them.`);
      form.reset();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const res = await fetch('/api/sources');
    const data = await res.json();
    setDocs(data.documents || []);
  }

  async function remove(id: number) {
    if (!confirm('Delete this source and its chunks?')) return;
    await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <form
        className="card space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          upload(e.currentTarget);
        }}
      >
        <p className="text-sm text-ink-soft">
          Add reference material — real exam questions, your notes, a topic summary. The app
          doesn&rsquo;t repeat it back; it uses it to write <strong>fresh</strong> questions in the
          same style and difficulty when you practise that topic.
        </p>

        {/* Primary, always-works path: paste. */}
        <div>
          <label className="label">Paste questions or notes</label>
          <textarea
            name="text"
            rows={6}
            className="input min-h-[140px] font-mono text-[13px] leading-relaxed"
            placeholder={
              'Paste real PYQs or notes here. Example:\n\n1. Who was the first Chief Minister of Tamil Nadu?\n   a) ... b) ... c) ... d) ...\n   Answer: ...'
            }
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Title</label>
            <input name="title" className="input w-56" placeholder="TN history — 2022 PYQs" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="category" className="input w-56" defaultValue="">
              <option value="">Auto-detect per chunk</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Adding…' : 'Add reference'}
          </button>
        </div>

        {/* Secondary: small file. PDFs over 4 MB are rejected by the host, hence the note. */}
        <div className="border-t border-ink-faint/10 pt-3">
          <label className="label">…or upload a small file (PDF / .txt, under 4 MB)</label>
          <input
            type="file"
            name="file"
            accept="application/pdf,.txt,text/plain"
            className="text-sm"
          />
          <p className="mt-1 text-xs text-ink-faint">
            Large or scanned PDFs fail to upload on free hosting — paste the text above instead.
          </p>
        </div>
      </form>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      <div className="card overflow-hidden">
        {docs.length === 0 ? (
          <p className="p-4 text-sm text-ink-faint">No source material yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Chunks</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-ink-faint/10">
                  <td className="px-4 py-2">{d.title}</td>
                  <td className="px-4 py-2">{d.category_name || 'Mixed / auto'}</td>
                  <td className="px-4 py-2">{d.chunk_count}</td>
                  <td className="px-4 py-2">{d.ingested_at}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-red-600 hover:underline" onClick={() => remove(d.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
