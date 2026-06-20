'use client';

import { useState } from 'react';
import type { Option } from '@/lib/types';

export interface FlaggedItem {
  id: number;
  stem: string;
  options: Record<Option, string>;
  correct: Option | null;
  category: string;
  sourceType: 'pyq' | 'generated';
  sourceRef: string | null;
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

export default function ReviewFlagged({ initialItems }: { initialItems: FlaggedItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<number | null>(null);

  async function act(id: number, action: 'verify' | 'delete', correctOption?: Option) {
    setBusy(id);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: id, action, correctOption }),
      });
      if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="card p-6 text-sm text-ink-faint">No flagged questions. 🎉</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Card key={it.id} item={it} busy={busy === it.id} onAct={act} />
      ))}
    </div>
  );
}

function Card({
  item,
  busy,
  onAct,
}: {
  item: FlaggedItem;
  busy: boolean;
  onAct: (id: number, action: 'verify' | 'delete', correctOption?: Option) => void;
}) {
  const [correct, setCorrect] = useState<Option | ''>(item.correct || '');
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <span className="rounded bg-sand px-2 py-0.5">{item.category}</span>
        <span className="rounded bg-sand px-2 py-0.5 uppercase">{item.sourceType}</span>
        {item.sourceRef && <span className="rounded bg-sand px-2 py-0.5">{item.sourceRef}</span>}
      </div>
      <p className="font-medium text-ink">{item.stem}</p>
      <div className="space-y-1.5">
        {OPTIONS.map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              correct === opt ? 'border-green-400 bg-green-50' : 'border-ink-faint/15'
            }`}
          >
            <input
              type="radio"
              name={`correct-${item.id}`}
              checked={correct === opt}
              onChange={() => setCorrect(opt)}
            />
            <span className="font-semibold">{opt}.</span>
            <span>{item.options[opt]}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={busy || !correct}
          onClick={() => onAct(item.id, 'verify', correct || undefined)}
        >
          {busy ? 'Saving…' : 'Fix & restore (verified)'}
        </button>
        <button
          className="btn-ghost text-red-600"
          disabled={busy}
          onClick={() => onAct(item.id, 'delete')}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
