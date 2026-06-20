'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizConfig } from '@/lib/types';

const SUGGESTIONS = [
  'Quiz me on Indian Polity, 10 medium questions',
  '15 hard questions on Tamil Nadu history',
  'Mix of polity and economy, 20 questions',
  'Full mock exam',
];

export default function ChatIntake({ apiKey }: { apiKey: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'building'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  // Ground generated questions in real exam-style questions via web search.
  const [useWeb, setUseWeb] = useState(true);

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
      if (!res.ok) throw new Error(data.error || 'Failed to parse');
      setConfig(data.config);
      setNote(data.config.note || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setStatus('idle');
    }
  }

  async function startQuiz() {
    if (!config) return;
    setError(null);
    setStatus('building');
    setBuilding(
      config.mode === 'mock'
        ? 'Building your 200-question mock… this can take a minute if questions are generated.'
        : 'Building your quiz…'
    );
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config, useWeb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build quiz');
      router.push(`/quiz/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('idle');
      setBuilding(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) parse(message.trim());
        }}
        className="flex gap-2"
      >
        <input
          className="input"
          placeholder="Describe your quiz…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status !== 'idle'}
          autoFocus
        />
        <button className="btn-primary" disabled={status !== 'idle' || !message.trim()}>
          {status === 'parsing' ? 'Reading…' : 'Configure'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-ink-faint/25 bg-white px-3 py-1 text-xs text-ink-soft hover:border-brand-400 hover:text-brand-600"
            onClick={() => {
              setMessage(s);
              parse(s);
            }}
            disabled={status !== 'idle'}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {config && (
        <div className="card space-y-3 p-4">
          {note && <p className="text-sm text-ink-soft">{note}</p>}
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip>Mode: {config.mode}</Chip>
            <Chip>Questions: {config.count}</Chip>
            <Chip>Difficulty: {config.difficulty}</Chip>
            {config.categories.length > 0 && <Chip>Topics: {config.categories.join(', ')}</Chip>}
            {config.subcategories.length > 0 && (
              <Chip>Subtopics: {config.subcategories.join(', ')}</Chip>
            )}
          </div>
          {apiKey && (
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={useWeb}
                onChange={(e) => setUseWeb(e.target.checked)}
                disabled={status === 'building'}
              />
              Ground new questions in real exam-style questions (web search) — more
              realistic, slightly slower &amp; uses a little API credit
            </label>
          )}
          {building && <p className="text-sm text-brand-600">{building}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={startQuiz} disabled={status === 'building'}>
              {status === 'building' ? 'Building…' : 'Start quiz'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => setConfig(null)}
              disabled={status === 'building'}
            >
              Edit request
            </button>
          </div>
          {!apiKey && config.mode !== 'mock' && (
            <p className="text-xs text-ink-faint">
              Without an API key, only existing bank questions are served (no generation).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
      {children}
    </span>
  );
}
