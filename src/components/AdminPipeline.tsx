'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Status {
  microtopicsTotal: number;
  microtopicsDecomposed: number;
  conceptsTotal: number;
  pyqTotal: number;
  pyqUnmapped: number;
  conceptsWithoutVariant: number;
  blueprintRows: number;
}
interface SampleConcept {
  statement: string;
  concept_type: string;
  source: string;
  pyq_frequency: number;
  subcategory: string;
  microtopic: string | null;
  has_question: number;
}

const STEPS: { key: string; label: string; batch: number; note: string }[] = [
  { key: 'mappyq', label: '1. Map PYQs → concepts', batch: 10, note: 'Maps each imported PYQ to the fact it tests.' },
  { key: 'decompose', label: '2. Decompose syllabus', batch: 3, note: 'Enumerates concepts per micro-topic (~178).' },
  { key: 'validate', label: '3. Validate (dedupe)', batch: 3, note: 'Merges/deletes duplicate or bad concepts.' },
  { key: 'blueprint', label: '4. Compute blueprint', batch: 1, note: 'PYQ weight per subcategory for mocks.' },
  { key: 'generate', label: '5. Generate 1 question / concept', batch: 3, note: 'The big one — one question per concept.' },
];

export default function AdminPipeline() {
  const [status, setStatus] = useState<Status | null>(null);
  const [hasKey, setHasKey] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [sample, setSample] = useState<SampleConcept[] | null>(null);
  const cancel = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/inventory');
    const d = await res.json();
    if (res.ok) {
      setStatus(d.status);
      setHasKey(d.hasApiKey);
    } else {
      setLog((l) => [`Error: ${d.error}`, ...l]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const line = (s: string) => setLog((l) => [s, ...l].slice(0, 200));

  async function runStep(step: string, batch: number) {
    if (running) return;
    cancel.current = false;
    setRunning(step);
    line(`▶ ${step} started`);
    try {
      // Loop until this step reports nothing remaining (or the user stops).
      for (let i = 0; i < 5000 && !cancel.current; i++) {
        const res = await fetch('/api/admin/inventory', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ step, batch }),
        });
        const d = await res.json();
        if (!res.ok) {
          line(`✕ ${step}: ${d.error}`);
          break;
        }
        line(`… ${step}: ${JSON.stringify(d.result)} · remaining ${d.remaining}`);
        await refresh();
        if (step === 'blueprint' || d.remaining <= 0) {
          line(`✓ ${step} complete`);
          break;
        }
      }
      if (cancel.current) line(`⏸ ${step} stopped`);
    } finally {
      setRunning(null);
      cancel.current = false;
    }
  }

  async function runAll() {
    for (const s of STEPS) {
      if (cancel.current) break;
      await runStep(s.key, s.batch);
    }
  }

  const pct = status && status.conceptsTotal > 0
    ? Math.round(((status.conceptsTotal - status.conceptsWithoutVariant) / status.conceptsTotal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {!hasKey && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ANTHROPIC_API_KEY is not set on the server — the pipeline can’t run.
        </p>
      )}

      {status && (
        <div className="card grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
          <Stat label="Micro-topics decomposed" value={`${status.microtopicsDecomposed}/${status.microtopicsTotal}`} />
          <Stat label="Concepts" value={status.conceptsTotal} />
          <Stat label="PYQs unmapped" value={`${status.pyqUnmapped}/${status.pyqTotal}`} />
          <Stat label="Concepts w/o question" value={status.conceptsWithoutVariant} />
          <Stat label="Blueprint rows" value={status.blueprintRows} />
          <Stat label="Questions generated" value={`${pct}%`} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={runAll} disabled={!!running || !hasKey}>
          {running ? 'Running…' : 'Run all steps'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            cancel.current = true;
          }}
          disabled={!running}
        >
          Stop
        </button>
        <button className="btn-ghost" onClick={refresh} disabled={!!running}>
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {STEPS.map((s) => (
          <div key={s.key} className="card flex flex-wrap items-center gap-3 p-3">
            <button
              className="btn-ghost"
              onClick={() => runStep(s.key, s.batch)}
              disabled={!!running || !hasKey}
            >
              {running === s.key ? 'Running…' : 'Run'}
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{s.label}</div>
              <div className="text-xs text-ink-faint">{s.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="text-xs font-semibold uppercase text-ink-faint">Spot-check concepts</div>
          <button
            className="btn-ghost ml-auto py-1 text-xs"
            onClick={async () => {
              const r = await fetch('/api/admin/inventory?sample=25');
              const d = await r.json();
              setSample(d.concepts || []);
            }}
          >
            {sample ? 'Reshuffle sample' : 'Show 25 random'}
          </button>
        </div>
        {sample && (
          <div className="max-h-80 space-y-2 overflow-auto">
            {sample.map((c, i) => (
              <div key={i} className="border-b border-ink-faint/10 pb-2 text-xs">
                <div className="text-ink">{c.statement}</div>
                <div className="mt-0.5 text-ink-faint">
                  {c.subcategory}
                  {c.microtopic ? ` › ${c.microtopic}` : ''} · {c.concept_type} ·{' '}
                  {c.source === 'pyq_mapping' ? `PYQ×${c.pyq_frequency}` : 'syllabus'}
                  {c.has_question ? ' · ✓ has question' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card max-h-72 overflow-auto p-3">
        <div className="mb-1 text-xs font-semibold uppercase text-ink-faint">Log</div>
        <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink-soft">
          {log.join('\n') || 'Idle.'}
        </pre>
      </div>

      <p className="text-xs text-ink-faint">
        Steps are resumable — leave this tab open; each click loops until that step is done. Step 5
        (generation) is thousands of calls and can take a long while; you can stop and resume anytime.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}
