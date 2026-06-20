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

  async function upload(form: HTMLFormElement) {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData(form);
      const res = await fetch('/api/sources', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMsg(`Ingested ${data.chunks} chunk(s).`);
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
        className="card flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          upload(e.currentTarget);
        }}
      >
        <div>
          <label className="label">Title</label>
          <input name="title" className="input w-56" placeholder="Laxmikanth — Polity" />
        </div>
        <div>
          <label className="label">File (PDF or .txt)</label>
          <input type="file" name="file" accept="application/pdf,.txt,text/plain" required className="text-sm" />
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
          {busy ? 'Ingesting…' : 'Add source'}
        </button>
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
