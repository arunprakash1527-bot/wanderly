'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizConfig } from '@/lib/types';

interface Sub {
  slug: string;
  name: string;
}
interface Cat {
  slug: string;
  name: string;
  section: string;
  subcategories: Sub[];
}

const SUGGESTIONS = ['25 MCQs on Indian Polity', 'Tamil Nadu history', 'Indian Economy', 'Full mock exam'];
const DIFFICULTIES = [
  { label: 'Medium', value: 'medium' as const },
  { label: 'Hard', value: 'hard' as const },
  { label: 'Very hard', value: 'very-hard' as const },
];

export default function SearchIntake({ apiKey, bankCount }: { apiKey: boolean; bankCount: number }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'parsing' | 'building'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<QuizConfig | null>(null);

  // Refine state (the follow-up answers).
  const [cats, setCats] = useState<Cat[]>([]);
  const [topic, setTopic] = useState<string>(''); // category slug
  const [subtopic, setSubtopic] = useState<string>(''); // subcategory slug
  // Kept as text so the field can be cleared and freely typed (the old numeric
  // state snapped back to 1 the moment you deleted the default). Clamped to a
  // valid number only when the quiz actually starts (and on blur).
  const [countText, setCountText] = useState('10');
  const [uiDiff, setUiDiff] = useState<'medium' | 'hard' | 'very-hard'>('medium');
  // Off by default — fast generation. Web grounding is an opt-in (slower).
  const [useWeb, setUseWeb] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Load categories once for the topic picker.
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
      .catch(() => {});
  }, []);

  // Count up while a quiz is building, so the wait has visible feedback.
  useEffect(() => {
    if (status !== 'building') {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  async function parse(text: string) {
    setError(null);
    setStatus('parsing');
    setConfig(null);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read that');
      const c: QuizConfig = data.config;
      setConfig(c);
      // Prefill the follow-ups from the parse.
      setTopic(c.categories[0] || '');
      setSubtopic(c.subcategories[0] || '');
      setCountText(String(c.count || 10));
      setUiDiff(c.difficulty === 'hard' ? 'hard' : 'medium');
      setShowAdvanced(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setStatus((s) => (s === 'parsing' ? 'idle' : s));
    }
  }

  async function start() {
    if (!config) return;
    const isMock = config.mode === 'mock';
    if (!isMock && !topic) {
      setError('Pick a topic to continue.');
      return;
    }
    setError(null);
    setStatus('building');
    // "Very hard" maps to the hard tier (DB has easy/medium/hard) with a tougher hint.
    const difficulty = uiDiff === 'medium' ? 'medium' : 'hard';
    const finalConfig: QuizConfig = isMock
      ? config
      : {
          mode: 'practice',
          categories: topic ? [topic] : [],
          subcategories: subtopic ? [subtopic] : [],
          difficulty,
          count: Math.min(100, Math.max(1, count)),
          note: uiDiff === 'very-hard' ? 'Make these very challenging.' : undefined,
        };
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config: finalConfig, useWeb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build quiz');
      router.push(`/quiz/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('idle');
    }
  }

  const selectedCat = cats.find((c) => c.slug === topic);
  const building = status === 'building';
  const parsing = status === 'parsing';
  // Numeric count used for the request/labels; empty or out-of-range falls back.
  const count = Math.min(100, Math.max(1, parseInt(countText, 10) || 10));

  return (
    <div className="mt-6 space-y-4 text-left">
      {/* Search bar — a single "find" affordance (icon), so the only verb-button
          in the whole flow is "Start". No more Generate-vs-Start confusion. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) parse(query.trim());
        }}
        className="relative"
      >
        <input
          className="input h-12 rounded-full pl-5 pr-14 text-base shadow-sm"
          placeholder="Type a subject, or what you want to practise…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={status !== 'idle'}
          autoFocus
        />
        <button
          aria-label="Find questions"
          className="btn-primary absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full p-0"
          disabled={status !== 'idle' || !query.trim()}
        >
          {parsing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span className="text-lg leading-none">→</span>
          )}
        </button>
      </form>

      {!config && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-ink-faint/25 bg-white px-3 py-1 text-xs text-ink-soft hover:border-brand-400 hover:text-brand-600"
              onClick={() => {
                setQuery(s);
                parse(s);
              }}
              disabled={status !== 'idle'}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {config && config.mode === 'mock' && (
        <div className="card space-y-4 p-5">
          <p className="text-sm text-ink-soft">
            Full mock — <strong>200 questions</strong> (175 GS + 25 Aptitude), 3-hour timer, 1.5
            marks/correct, no negative marking.
          </p>
          {apiKey && !building && (
            <WebToggle useWeb={useWeb} setUseWeb={setUseWeb} disabled={false} />
          )}
          {building ? (
            <Building elapsed={elapsed} count={200} useWeb={useWeb} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={start}>
                Start full mock
              </button>
              <button className="btn-ghost" onClick={() => setConfig(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {config && config.mode !== 'mock' && (
        <div className="card space-y-4 p-5">
          {building ? (
            <Building elapsed={elapsed} count={count} useWeb={useWeb} />
          ) : (
            <>
              <fieldset className="space-y-4">
                {/* Topic + subtopic — stack on mobile, side-by-side on desktop. */}
                <div>
                  <label className="label">Topic</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      className="input sm:flex-1"
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setSubtopic('');
                      }}
                    >
                      <option value="">— choose a topic —</option>
                      {cats.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {selectedCat && selectedCat.subcategories.length > 0 && (
                      <select
                        className="input sm:flex-1"
                        value={subtopic}
                        onChange={(e) => setSubtopic(e.target.value)}
                      >
                        <option value="">All subtopics</option>
                        {selectedCat.subcategories.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* How many + difficulty on one tidy row. */}
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                  <div>
                    <label className="label">Questions</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      className="input w-24"
                      value={countText}
                      onChange={(e) => {
                        const v = e.target.value;
                        // Allow empty (so the default can be cleared) and up to 3 digits.
                        if (v === '' || /^\d{1,3}$/.test(v)) setCountText(v);
                      }}
                      onBlur={() => {
                        const n = parseInt(countText, 10);
                        setCountText(String(!n || n < 1 ? 1 : n > 100 ? 100 : n));
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">Difficulty</label>
                    <div className="inline-flex overflow-hidden rounded-lg border border-ink-faint/20">
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setUiDiff(d.value)}
                          className={`px-3 py-2 text-sm transition ${
                            uiDiff === d.value
                              ? 'bg-brand-500 text-white'
                              : 'bg-white text-ink-soft hover:bg-brand-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Primary action — the one and only verb-button. */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button className="btn-primary" onClick={start} disabled={!topic}>
                  {`Start ${count} questions →`}
                </button>
                <button className="btn-ghost" onClick={() => setConfig(null)}>
                  Cancel
                </button>
                {apiKey && (
                  <button
                    type="button"
                    className="ml-auto text-xs text-ink-faint underline-offset-2 hover:text-ink-soft hover:underline"
                    onClick={() => setShowAdvanced((v) => !v)}
                  >
                    {showAdvanced ? 'Hide options' : 'More options'}
                  </button>
                )}
              </div>

              {apiKey && showAdvanced && (
                <div className="border-t border-ink-faint/10 pt-3">
                  <WebToggle useWeb={useWeb} setUseWeb={setUseWeb} disabled={false} />
                </div>
              )}

              {bankCount === 0 && !apiKey && (
                <p className="text-xs text-amber-600">
                  No API key set and your bank is empty — add ANTHROPIC_API_KEY to generate
                  questions, or ingest a PYQ paper first.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Building({ elapsed, count, useWeb }: { elapsed: number; count: number; useWeb: boolean }) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <div className="text-sm font-medium text-brand-700">
          Building your {count}-question quiz… {elapsed}s
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Questions are written by AI and saved to your bank
        {useWeb ? ', with live web search for exam-style grounding' : ''}.
        {useWeb || count > 15
          ? ' This can take a while — on free hosting, requests time out after ~60s, so turn web search off and keep counts ≤15 if it stalls.'
          : ' Usually a few seconds.'}
      </p>
    </div>
  );
}

function WebToggle({
  useWeb,
  setUseWeb,
  disabled,
}: {
  useWeb: boolean;
  setUseWeb: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={useWeb}
        onChange={(e) => setUseWeb(e.target.checked)}
        disabled={disabled}
      />
      <span>
        Ground in real exam-style questions via web search.
        <span className="text-ink-faint"> More realistic, but slower (~30s+).</span>
      </span>
    </label>
  );
}
