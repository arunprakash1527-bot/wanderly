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
  const [count, setCount] = useState(10);
  const [uiDiff, setUiDiff] = useState<'medium' | 'hard' | 'very-hard'>('medium');
  // Off by default — fast generation. Web grounding is an opt-in (slower).
  const [useWeb, setUseWeb] = useState(false);

  // Load categories once for the topic picker.
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
      .catch(() => {});
  }, []);

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
      setCount(c.count || 10);
      setUiDiff(c.difficulty === 'hard' ? 'hard' : 'medium');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setStatus('idle');
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

  return (
    <div className="mt-6 space-y-4 text-left">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) parse(query.trim());
        }}
        className="flex gap-2"
      >
        <input
          className="input h-12 rounded-full px-5 text-base shadow-sm"
          placeholder="Type a subject, or what you want to practise…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={status !== 'idle'}
          autoFocus
        />
        <button className="btn-primary h-12 rounded-full px-6" disabled={status !== 'idle' || !query.trim()}>
          {status === 'parsing' ? '…' : 'Generate'}
        </button>
      </form>

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

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {config && config.mode === 'mock' && (
        <div className="card space-y-3 p-5">
          <p className="text-sm text-ink-soft">
            Full mock — <strong>200 questions</strong> (175 GS + 25 Aptitude), 3-hour timer, 1.5
            marks/correct, no negative marking.
          </p>
          {apiKey && <WebToggle useWeb={useWeb} setUseWeb={setUseWeb} disabled={status === 'building'} />}
          <button className="btn-primary" onClick={start} disabled={status === 'building'}>
            {status === 'building' ? 'Building 200-question mock…' : 'Start full mock'}
          </button>
        </div>
      )}

      {config && config.mode !== 'mock' && (
        <div className="card space-y-4 p-5">
          {/* 1. Topic / subtopic */}
          <div>
            <label className="label">Topic</label>
            <div className="flex flex-wrap gap-2">
              <select
                className="input w-64"
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
                  className="input w-56"
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

          {/* 2. How many */}
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="label">How many MCQs</label>
              <input
                type="number"
                min={1}
                max={100}
                className="input w-28"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value || '1', 10))}
              />
            </div>
            {/* 3. Difficulty */}
            <div>
              <label className="label">Difficulty</label>
              <div className="flex gap-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setUiDiff(d.value)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      uiDiff === d.value
                        ? 'bg-brand-500 text-white'
                        : 'border border-ink-faint/20 bg-white text-ink-soft'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {apiKey && <WebToggle useWeb={useWeb} setUseWeb={setUseWeb} disabled={status === 'building'} />}

          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={start} disabled={status === 'building' || !topic}>
              {status === 'building' ? 'Building…' : `Start ${count} MCQs`}
            </button>
            <button className="btn-ghost" onClick={() => setConfig(null)} disabled={status === 'building'}>
              Clear
            </button>
          </div>
          {bankCount === 0 && !apiKey && (
            <p className="text-xs text-amber-600">
              No API key set and your bank is empty — add ANTHROPIC_API_KEY to generate questions, or
              ingest a PYQ paper first.
            </p>
          )}
        </div>
      )}
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
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <input type="checkbox" checked={useWeb} onChange={(e) => setUseWeb(e.target.checked)} disabled={disabled} />
      Ground in real exam-style questions via web search — more realistic, but{' '}
      <strong>slower</strong> (may take ~30s+)
    </label>
  );
}
