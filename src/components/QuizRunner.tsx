'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Option } from '@/lib/types';

export interface ClientQuestion {
  attemptId: number;
  questionId: number;
  stem: string;
  options: Record<Option, string>;
  category: string;
  subcategory: string | null;
  sourceType: 'pyq' | 'generated';
  source: string | null;
  isRepeat: boolean;
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export default function QuizRunner({
  sessionId,
  mode,
  questions,
  remainingSeconds,
}: {
  sessionId: number;
  mode: 'practice' | 'mock';
  questions: ClientQuestion[];
  remainingSeconds: number | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Option>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [seconds, setSeconds] = useState(remainingSeconds ?? 0); // countdown or count-up
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const perQuestionStart = useRef(Date.now());
  const timeSpent = useRef<Record<number, number>>({});

  const q = questions[current];

  // Timer: countdown for mock, count-up for practice. Auto-submit at zero.
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (mode === 'mock') {
          if (s <= 1) {
            clearInterval(id);
            void doSubmit(true);
            return 0;
          }
          return s - 1;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const recordTime = useCallback(() => {
    if (!q) return;
    const delta = Math.round((Date.now() - perQuestionStart.current) / 1000);
    timeSpent.current[q.attemptId] = (timeSpent.current[q.attemptId] || 0) + delta;
    perQuestionStart.current = Date.now();
  }, [q]);

  const goto = useCallback(
    (idx: number) => {
      recordTime();
      setCurrent(Math.max(0, Math.min(questions.length - 1, idx)));
    },
    [questions.length, recordTime]
  );

  const choose = useCallback(
    (opt: Option) => {
      if (!q) return;
      setAnswers((a) => ({ ...a, [q.attemptId]: opt }));
    },
    [q]
  );

  async function flag() {
    if (!q || flagged[q.questionId]) return;
    setFlagged((f) => ({ ...f, [q.questionId]: true }));
    try {
      await fetch(`/api/quiz/${sessionId}/flag`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: q.questionId, attemptId: q.attemptId }),
      });
    } catch {
      /* non-blocking */
    }
  }

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      if (!auto) {
        const unanswered = questions.length - Object.keys(answers).length;
        if (
          unanswered > 0 &&
          !confirm(`${unanswered} question(s) are unanswered. Submit anyway?`)
        )
          return;
      }
      setSubmitting(true);
      recordTime();
      const payload = {
        durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
        answers: questions.map((qq) => ({
          attemptId: qq.attemptId,
          chosenOption: answers[qq.attemptId] ?? null,
          timeSpentSeconds: timeSpent.current[qq.attemptId] || 0,
        })),
      };
      try {
        const res = await fetch(`/api/quiz/${sessionId}/submit`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('submit failed');
        router.push(`/results/${sessionId}`);
      } catch {
        setSubmitting(false);
        alert('Could not submit. Please try again.');
      }
    },
    [answers, questions, recordTime, router, sessionId, submitting]
  );

  // Keyboard shortcuts: 1-4 choose, arrows navigate, Enter next.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (submitting) return;
      if (['1', '2', '3', '4'].includes(e.key)) choose(OPTIONS[parseInt(e.key, 10) - 1]);
      else if (e.key === 'ArrowRight' || e.key === 'Enter') goto(current + 1);
      else if (e.key === 'ArrowLeft') goto(current - 1);
      else if (e.key.toLowerCase() === 'm') setMarked((m) => ({ ...m, [q?.attemptId ?? -1]: !m[q?.attemptId ?? -1] }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, current, goto, q, submitting]);

  const answeredCount = Object.keys(answers).length;
  const timerLabel = useMemo(() => formatTime(seconds), [seconds]);
  const lowTime = mode === 'mock' && seconds <= 300;

  if (!q) return <div className="card p-6">This quiz has no questions.</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-faint">
            Question {current + 1} of {questions.length} ·{' '}
            <span className="capitalize">{mode}</span>
          </div>
          <div
            className={`rounded-md px-3 py-1 font-mono text-sm font-semibold ${
              lowTime ? 'bg-red-100 text-red-700' : 'bg-ink/5 text-ink'
            }`}
          >
            {mode === 'mock' ? '⏳ ' : '⏱ '}
            {timerLabel}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-xs text-ink-faint">
            <span className="rounded bg-sand px-2 py-0.5">{q.category}</span>
            {q.subcategory && <span className="rounded bg-sand px-2 py-0.5">{q.subcategory}</span>}
            {q.isRepeat && (
              <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                Repeat
              </span>
            )}
            <span className="ml-auto rounded bg-sand px-2 py-0.5 uppercase">{q.sourceType}</span>
          </div>
          <p className="text-base font-medium leading-relaxed text-ink">{q.stem}</p>

          <div className="mt-4 space-y-2">
            {OPTIONS.map((opt, i) => {
              const selected = answers[q.attemptId] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => choose(opt)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-ink'
                      : 'border-ink-faint/20 bg-white hover:border-brand-300'
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                      selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-faint/40'
                    }`}
                  >
                    {opt}
                  </span>
                  <span className="leading-relaxed">{q.options[opt]}</span>
                  <span className="ml-auto text-[10px] text-ink-faint">{i + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Source/citation shown under the question. PYQs carry a real exam
              reference; generated questions carry an AI-suggested one (flagged). */}
          <p className="mt-3 text-xs text-ink-faint">
            {q.sourceType === 'pyq' ? (
              <>
                <span className="font-medium text-ink-soft">Source:</span>{' '}
                {q.source || 'Previous-year question'}
              </>
            ) : (
              <>
                <span className="font-medium text-ink-soft">Reference:</span>{' '}
                {q.source || `AI-generated · ${q.category}`}
                <span className="italic"> — AI-suggested, verify.</span>
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={() => goto(current - 1)} disabled={current === 0}>
              ← Prev
            </button>
            <button
              className="btn-ghost"
              onClick={() => setMarked((m) => ({ ...m, [q.attemptId]: !m[q.attemptId] }))}
            >
              {marked[q.attemptId] ? '★ Marked' : '☆ Mark for review'}
            </button>
            {answers[q.attemptId] && (
              <button
                className="btn-ghost text-ink-faint"
                onClick={() => setAnswers((a) => {
                  const n = { ...a };
                  delete n[q.attemptId];
                  return n;
                })}
              >
                Clear
              </button>
            )}
            <button
              className={`btn-ghost ml-auto ${flagged[q.questionId] ? 'text-amber-600' : ''}`}
              onClick={flag}
              disabled={flagged[q.questionId]}
              title="This question looks wrong — exclude it from future quizzes"
            >
              {flagged[q.questionId] ? '⚑ Flagged' : '⚐ Flag as wrong'}
            </button>
            <button className="btn-primary" onClick={() => goto(current + 1)} disabled={current === questions.length - 1}>
              Next →
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-faint">
          Shortcuts: <kbd>1</kbd>–<kbd>4</kbd> choose · <kbd>←</kbd>/<kbd>→</kbd> navigate ·{' '}
          <kbd>M</kbd> mark for review.
        </p>
      </div>

      {/* Palette + submit */}
      <aside className="space-y-4">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
            <span>Answered {answeredCount}/{questions.length}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {questions.map((qq, idx) => {
              const isAnswered = answers[qq.attemptId];
              const isMarked = marked[qq.attemptId];
              const isCurrent = idx === current;
              return (
                <button
                  key={qq.attemptId}
                  onClick={() => goto(idx)}
                  className={`grid h-8 w-8 place-items-center rounded text-xs font-medium transition ${
                    isCurrent
                      ? 'ring-2 ring-brand-500'
                      : ''
                  } ${
                    isMarked
                      ? 'bg-amber-400 text-white'
                      : isAnswered
                        ? 'bg-brand-500 text-white'
                        : 'bg-ink/5 text-ink-soft hover:bg-ink/10'
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-ink-faint">
            <Legend className="bg-brand-500" label="Answered" />
            <Legend className="bg-amber-400" label="Marked for review" />
            <Legend className="bg-ink/10" label="Not visited" />
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={() => doSubmit(false)}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit quiz'}
        </button>
      </aside>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </div>
  );
}

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
