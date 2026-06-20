'use client';

import { useState } from 'react';
import type { Option } from '@/lib/types';

export interface ReviewItem {
  questionId: number;
  stem: string;
  options: Record<Option, string>;
  correct: Option | null;
  chosen: Option | null;
  isCorrect: boolean;
  skipped: boolean;
  explanation: string | null;
  category: string;
  subcategory: string | null;
  sourceType: 'pyq' | 'generated';
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export default function ResultsReview({ items }: { items: ReviewItem[] }) {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'skipped'>('all');
  const shown = items.filter((it) =>
    filter === 'all' ? true : filter === 'wrong' ? !it.isCorrect && !it.skipped : it.skipped
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 no-print">
        <h2 className="text-lg font-semibold">Review</h2>
        <div className="ml-auto flex gap-1 text-xs">
          {(['all', 'wrong', 'skipped'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 capitalize ${
                filter === f ? 'bg-brand-500 text-white' : 'bg-white text-ink-soft border border-ink-faint/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-3">
        {shown.map((it, idx) => (
          <ReviewCard key={it.questionId} item={it} index={items.indexOf(it) + 1} />
        ))}
      </ol>
      {shown.length === 0 && (
        <p className="card p-4 text-sm text-ink-faint">Nothing to show for this filter.</p>
      )}
    </section>
  );
}

function ReviewCard({ item, index }: { item: ReviewItem; index: number }) {
  const [explanation, setExplanation] = useState(item.explanation);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/explanation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: item.questionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setExplanation(data.explanation || 'No explanation available.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  const badge = item.skipped
    ? { text: 'Skipped', cls: 'bg-ink/10 text-ink-soft' }
    : item.isCorrect
      ? { text: 'Correct', cls: 'bg-green-100 text-green-700' }
      : { text: 'Wrong', cls: 'bg-red-100 text-red-700' };

  return (
    <li className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="font-semibold text-ink-faint">Q{index}</span>
        <span className={`rounded px-2 py-0.5 font-medium ${badge.cls}`}>{badge.text}</span>
        <span className="rounded bg-sand px-2 py-0.5 text-ink-faint">{item.category}</span>
        <span className="ml-auto rounded bg-sand px-2 py-0.5 uppercase text-ink-faint">
          {item.sourceType}
        </span>
      </div>
      <p className="font-medium text-ink">{item.stem}</p>
      <div className="mt-3 space-y-1.5">
        {OPTIONS.map((opt) => {
          const isCorrect = item.correct === opt;
          const isChosen = item.chosen === opt;
          return (
            <div
              key={opt}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                isCorrect
                  ? 'border-green-400 bg-green-50'
                  : isChosen
                    ? 'border-red-400 bg-red-50'
                    : 'border-ink-faint/15'
              }`}
            >
              <span className="font-semibold">{opt}.</span>
              <span className="flex-1">{item.options[opt]}</span>
              {isCorrect && <span className="text-xs font-medium text-green-700">✓ correct</span>}
              {isChosen && !isCorrect && (
                <span className="text-xs font-medium text-red-700">your answer</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md bg-sand p-3 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Explanation
        </div>
        {explanation ? (
          <p className="text-ink-soft">{explanation}</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-ink-faint">No explanation yet.</span>
            <button className="btn-ghost py-1 text-xs no-print" onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate explanation'}
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
