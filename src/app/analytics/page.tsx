'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AccuracyRow {
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}
interface TrendPoint {
  date: string;
  accuracy: number;
  scoreMarks: number;
  mode: string;
}
interface AnalyticsData {
  byCategory: AccuracyRow[];
  bySubcategory: AccuracyRow[];
  volume: { name: string; total: number }[];
  trend: TrendPoint[];
}
interface RecStats {
  weak: { name: string; accuracy: number; attempts: number }[];
  strong: { name: string; accuracy: number; attempts: number }[];
  underPracticed: { name: string; attempts: number }[];
  overall: { sessions: number; accuracy: number; totalAttempts: number };
}

function accColor(a: number) {
  if (a >= 75) return '#16a34a';
  if (a >= 50) return '#f59e0b';
  return '#dc2626';
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [rec, setRec] = useState<{ stats: RecStats; narrative: string | null; hasKey: boolean } | null>(
    null
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(true);

  const qs = useCallback(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (mode) p.set('mode', mode);
    return p.toString();
  }, [from, to, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        fetch(`/api/analytics?${qs()}`).then((x) => x.json()),
        fetch(`/api/recommendations?${qs()}`).then((x) => x.json()),
      ]);
      setData(a);
      setRec(r);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  const hasData = data && data.byCategory.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Mode</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">All</option>
              <option value="practice">Practice</option>
              <option value="mock">Mock</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="card p-6 text-sm text-ink-faint">Loading…</p>}

      {!loading && !hasData && (
        <p className="card p-6 text-sm text-ink-faint">
          No completed quizzes in this range yet. Take a quiz to see analytics.
        </p>
      )}

      {!loading && hasData && data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Accuracy by category">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.byCategory} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {data.byCategory.map((r, i) => (
                      <Cell key={i} fill={accColor(r.accuracy)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Score / accuracy trend">
              {data.trend.length > 1 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.trend.map((t, i) => ({ ...t, label: `#${i + 1}` }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#2f6fed" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty>Take at least two quizzes to see a trend.</Empty>
              )}
            </ChartCard>

            <ChartCard title="Weakest subcategories">
              {data.bySubcategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.bySubcategory.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 20, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                      {data.bySubcategory.slice(0, 8).map((r, i) => (
                        <Cell key={i} fill={accColor(r.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty>No subcategory-tagged attempts yet.</Empty>
              )}
            </ChartCard>

            <ChartCard title="Volume per category (under-practiced first)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.volume} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2f6fed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {rec && (
            <section className="card p-5">
              <h2 className="mb-2 text-lg font-semibold">Recommendations</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <RecList title="Focus (weakest)" rows={rec.stats.weak} suffix="acc" />
                <RecList title="Strengths" rows={rec.stats.strong} suffix="acc" />
                <RecList
                  title="Under-practiced"
                  rows={rec.stats.underPracticed.map((u) => ({ name: u.name, accuracy: u.attempts, attempts: u.attempts }))}
                  suffix="att"
                />
              </div>
              <div className="mt-4 rounded-md bg-sand p-4 text-sm leading-relaxed text-ink-soft">
                {rec.narrative ? (
                  <p className="whitespace-pre-wrap">{rec.narrative}</p>
                ) : rec.stats.overall.totalAttempts === 0 ? (
                  <span className="text-ink-faint">Answer some questions to get a study plan.</span>
                ) : !rec.hasKey ? (
                  <span className="text-ink-faint">
                    Set <code>ANTHROPIC_API_KEY</code> to get an AI-written study plan. The stats
                    above are computed without it.
                  </span>
                ) : (
                  <span className="text-ink-faint">
                    Not enough data per topic yet (need ≥10 attempts in a category).
                  </span>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid h-[280px] place-items-center text-sm text-ink-faint">{children}</div>;
}

function RecList({
  title,
  rows,
  suffix,
}: {
  title: string;
  rows: { name: string; accuracy: number; attempts: number }[];
  suffix: 'acc' | 'att';
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</div>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-faint">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex justify-between gap-2">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 text-ink-faint">
                {suffix === 'acc' ? `${r.accuracy}% · ${r.attempts}q` : `${r.attempts}q`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
