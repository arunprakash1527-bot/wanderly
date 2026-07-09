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
  generationTarget: number; // capped target (top-K per micro-topic)
  generationRemaining: number; // capped remaining (within target, no question yet)
  maxPerMicro: number; // 0 = no cap
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
  { key: 'generate', label: '5. Generate questions', batch: 3, note: 'One question for the top concepts per micro-topic (see target above). The tail generates lazily on demand.' },
];

export default function AdminPipeline({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [hasKey, setHasKey] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [sample, setSample] = useState<SampleConcept[] | null>(null);
  const [genCategory, setGenCategory] = useState(''); // '' = all categories
  const [replaceExisting, setReplaceExisting] = useState(false);
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

  async function runStep(step: string, batch: number, category?: string) {
    if (running) return;
    cancel.current = false;
    setRunning(step);
    const scopeLabel = category ? ` (${category})` : '';
    line(`▶ ${step}${scopeLabel} started`);
    try {
      // Loop until this step reports nothing remaining (or the user stops).
      for (let i = 0; i < 5000 && !cancel.current; i++) {
        const res = await fetch('/api/admin/inventory', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ step, batch, category: category ?? null }),
        });
        const d = await res.json();
        if (!res.ok) {
          line(`✕ ${step}: ${d.error}`);
          break;
        }
        line(`… ${step}: ${JSON.stringify(d.result)} · remaining ${d.remaining}`);
        await refresh();
        // Stop when the step (or the scoped category) is exhausted; also guard
        // against a stall where a batch can make no further progress.
        if (step === 'blueprint' || d.remaining <= 0 || d.result?.processed === 0) {
          line(`✓ ${step}${scopeLabel} complete`);
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

  // Step 5 runner: optionally wipe the category's generated questions first, then
  // generate (so improved prompts fully replace older-format questions).
  async function runGenerate() {
    if (running) return;
    const cat = genCategory || undefined;
    if (replaceExisting) {
      const label = cat || 'all categories';
      if (!confirm(`Delete existing generated questions for ${label} and regenerate them?`)) return;
      line(`▶ clearing generated questions (${label})…`);
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: 'cleargen', category: genCategory || null }),
      });
      const d = await res.json();
      line(res.ok ? `✓ cleared ${d.result?.deleted ?? 0}` : `✕ ${d.error}`);
      await refresh();
    }
    await runStep('generate', 3, cat);
  }

  // Progress is measured against the capped target (the concepts we actually
  // intend to generate), not the full inventory — so 100% means "done", not
  // "generated a question for every one of thousands of atomic facts".
  const pct = status && status.generationTarget > 0
    ? Math.round(((status.generationTarget - status.generationRemaining) / status.generationTarget) * 100)
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
          <Stat label="Concepts (inventory)" value={status.conceptsTotal} />
          <Stat
            label={status.maxPerMicro > 0 ? `Generation target (top ${status.maxPerMicro}/topic)` : 'Generation target (all)'}
            value={status.generationTarget}
          />
          <Stat label="Remaining to generate" value={status.generationRemaining} />
          <Stat label="Blueprint rows" value={status.blueprintRows} />
          <Stat label="Generated" value={`${pct}%`} />
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
        <button
          className="btn-ghost"
          disabled={!!running}
          onClick={async () => {
            if (!confirm('Remove duplicate PYQs and junk placeholder concepts?')) return;
            const res = await fetch('/api/admin/inventory', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ step: 'cleanup' }),
            });
            const d = await res.json();
            line(res.ok ? `✓ cleanup: ${JSON.stringify(d.result)}` : `✕ ${d.error}`);
            await refresh();
          }}
        >
          Clean up inventory
        </button>
      </div>

      <div className="space-y-2">
        {STEPS.map((s) => (
          <div key={s.key} className="card flex flex-wrap items-center gap-3 p-3">
            <button
              className="btn-ghost"
              onClick={() => (s.key === 'generate' ? runGenerate() : runStep(s.key, s.batch))}
              disabled={!!running || !hasKey}
            >
              {running === s.key ? 'Running…' : 'Run'}
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{s.label}</div>
              <div className="text-xs text-ink-faint">{s.note}</div>
            </div>
            {s.key === 'generate' && (
              <div className="ml-auto flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <select
                  className="input w-full sm:w-64"
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  disabled={!!running}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} only
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    disabled={!!running}
                  />
                  Replace existing (wipe &amp; regenerate this scope)
                </label>
              </div>
            )}
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
