'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cell {
  subcategory_id: number;
  subcategory: string;
  subcategory_slug: string;
  category_id: number;
  category: string;
  category_slug: string;
  total: number;
  tested: number;
  correct: number;
  weight: number;
}
interface Report {
  cells: Cell[];
  headline: {
    totalConcepts: number;
    coveragePct: number;
    masteryPct: number;
    neverTested: number;
    wrongDue: number;
  };
  suggested: {
    subcategory_id: number;
    subcategory: string;
    subcategory_slug: string;
    category: string;
    category_slug: string;
    coverage: number;
  }[];
}

// Coverage colour scale (loud for untested — the false-security risk).
function covColor(frac: number, total: number) {
  if (total === 0) return 'bg-ink/5 text-ink-faint';
  if (frac === 0) return 'bg-red-100 text-red-800';
  if (frac < 0.34) return 'bg-orange-100 text-orange-800';
  if (frac < 0.67) return 'bg-amber-100 text-amber-800';
  if (frac < 1) return 'bg-lime-100 text-lime-800';
  return 'bg-green-200 text-green-900';
}

export default function CoverageDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/coverage')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const byCategory = useMemo(() => {
    const m = new Map<string, Cell[]>();
    for (const c of data?.cells || []) {
      if (!m.has(c.category)) m.set(c.category, []);
      m.get(c.category)!.push(c);
    }
    return [...m.entries()];
  }, [data]);

  async function practice(categorySlug: string, subcategorySlug: string, key: string) {
    setStarting(key);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          config: {
            mode: 'practice',
            categories: [categorySlug],
            subcategories: [subcategorySlug],
            microtopics: [],
            difficulty: 'mixed',
            count: 10,
          },
          useWeb: false,
        }),
      });
      const d = await res.json();
      if (res.ok) router.push(`/quiz/${d.sessionId}`);
      else setStarting(null);
    } catch {
      setStarting(null);
    }
  }

  if (loading) return <p className="card p-6 text-sm text-ink-faint">Loading coverage…</p>;
  if (!data || data.headline.totalConcepts === 0) {
    return (
      <p className="card p-6 text-sm text-ink-faint">
        No concept inventory yet. Once the owner builds it (Admin → Concept inventory), this page
        shows how much of the syllabus you’ve been tested on.
      </p>
    );
  }

  const h = data.headline;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Syllabus coverage" value={`${h.coveragePct}%`} accent sub={`${data.headline.totalConcepts - h.neverTested}/${h.totalConcepts} concepts`} />
        <Stat label="Mastery (of tested)" value={`${h.masteryPct}%`} />
        <Stat label="Never tested" value={h.neverTested} sub="concepts" />
        <Stat label="Wrong & due" value={h.wrongDue} sub="concepts" />
      </section>

      {data.suggested.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Suggested next session</h2>
          <div className="flex flex-col gap-2">
            {data.suggested.map((s) => {
              const key = `sug-${s.subcategory_id}`;
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-ink">{s.subcategory}</span>
                  <span className="text-xs text-ink-faint">
                    {s.category} · {Math.round(s.coverage * 100)}% covered
                  </span>
                  <button
                    className="btn-primary ml-auto py-1 text-xs"
                    onClick={() => practice(s.category_slug, s.subcategory_slug, key)}
                    disabled={!!starting}
                  >
                    {starting === key ? 'Starting…' : 'Practice this'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Coverage by topic</h2>
        {byCategory.map(([cat, cells]) => (
          <div key={cat} className="card p-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">{cat}</h3>
            <div className="space-y-1.5">
              {cells.map((c) => {
                const frac = c.total ? c.tested / c.total : 0;
                const mastery = c.tested ? Math.round((c.correct / c.tested) * 100) : 0;
                return (
                  <div key={c.subcategory_id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="w-40 shrink-0 truncate text-ink-soft">{c.subcategory}</span>
                    <span className={`rounded px-2 py-0.5 font-medium ${covColor(frac, c.total)}`}>
                      {c.total === 0 ? 'no concepts' : `${c.tested}/${c.total} covered`}
                    </span>
                    {c.tested > 0 && (
                      <span className="text-ink-faint">mastery {mastery}%</span>
                    )}
                    {c.total > 0 && (
                      <button
                        className="ml-auto text-brand-600 hover:underline"
                        onClick={() => practice(c.category_slug, c.subcategory_slug, `c-${c.subcategory_id}`)}
                        disabled={!!starting}
                      >
                        {starting === `c-${c.subcategory_id}` ? '…' : 'practice'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-brand-600' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}
