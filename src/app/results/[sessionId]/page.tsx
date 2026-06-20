import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession, getSessionQuestions } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { MARK_PER_CORRECT } from '@/lib/weights';
import ResultsReview, { type ReviewItem } from '@/components/ResultsReview';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({ params }: { params: { sessionId: string } }) {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const sessionId = parseInt(params.sessionId, 10);
  if (Number.isNaN(sessionId)) notFound();
  const session = await getSession(user.id, sessionId);
  if (!session) notFound();
  if (!session.completed_at) redirect(`/quiz/${sessionId}`);

  const rows = await getSessionQuestions(sessionId);
  const correct = rows.filter((r) => r.attempt_is_correct === 1).length;
  const skipped = rows.filter((r) => r.chosen_option == null).length;
  const incorrect = rows.length - correct - skipped;
  const accuracy = rows.length ? Math.round((correct / rows.length) * 100) : 0;

  const items: ReviewItem[] = rows.map((r) => ({
    questionId: r.id,
    stem: r.stem,
    options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
    correct: r.correct_option,
    chosen: r.chosen_option,
    isCorrect: r.attempt_is_correct === 1,
    skipped: r.chosen_option == null,
    explanation: r.explanation,
    category: r.category_name,
    subcategory: r.subcategory_name,
    sourceType: r.source_type,
    source: r.source_ref,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-xl font-semibold">Results</h1>
        <div className="flex gap-2">
          <a className="btn-ghost" href={`/api/export/pdf?sessionId=${sessionId}`} target="_blank">
            Export PDF
          </a>
          <Link className="btn-primary" href="/">
            New quiz
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Score" value={`${(correct * MARK_PER_CORRECT).toFixed(1)}`} sub="marks" accent />
        <Stat label="Accuracy" value={`${accuracy}%`} sub={`${correct}/${rows.length} correct`} />
        <Stat label="Breakdown" value={`${correct} · ${incorrect} · ${skipped}`} sub="correct · wrong · skipped" />
        <Stat label="Time taken" value={formatDuration(session.duration_seconds || 0)} sub={session.mode} />
      </section>

      {session.mode === 'mock' && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 no-print">
          Reminder: Prelims is qualifying only — these marks don&rsquo;t count toward final merit,
          but they&rsquo;re a solid practice signal.
        </p>
      )}

      <ResultsReview items={items} />
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
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-brand-600' : 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
