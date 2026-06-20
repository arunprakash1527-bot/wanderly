import Link from 'next/link';
import { bankStats } from '@/lib/repo';
import { hasApiKey } from '@/lib/claude';
import ChatIntake from '@/components/ChatIntake';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const stats = bankStats();
  const totalVerified = stats.reduce((a, s) => a + (s.pyq_verified || 0), 0);
  const totalGenerated = stats.reduce((a, s) => a + (s.generated || 0), 0);
  const needsAnswer = stats.reduce((a, s) => a + (s.needs_answer || 0), 0);
  const apiKey = hasApiKey();

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-xl font-semibold text-ink">Set up a quiz</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tell me what to test you on — e.g.{' '}
          <em>&ldquo;Quiz me on Indian Polity, 10 medium questions&rdquo;</em>,{' '}
          <em>&ldquo;15 hard questions on Tamil Nadu history&rdquo;</em>, or{' '}
          <em>&ldquo;Full mock exam&rdquo;</em>.
        </p>
        <ChatIntake apiKey={apiKey} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Verified PYQs" value={totalVerified} accent />
        <StatCard label="Generated questions" value={totalGenerated} />
        <StatCard label="PYQs needing an answer" value={needsAnswer} warn={needsAnswer > 0} />
      </section>

      <section className="card p-5 text-sm text-ink-soft">
        <h2 className="mb-2 font-semibold text-ink">Prelims at a glance</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>200 MCQs · 300 marks · 3 hours · 1.5 marks per correct · no negative marking.</li>
          <li>175 General Studies (degree standard) + 25 Aptitude (SSLC standard).</li>
          <li>
            Prelims is qualifying/screening only — marks don&rsquo;t count toward final merit, but
            we score it normally for practice value.
          </li>
        </ul>
        {!apiKey && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            No <code>ANTHROPIC_API_KEY</code> set. Chat parsing falls back to a simple offline
            parser, and AI question generation / extraction / explanations are disabled until you
            add a key to <code>.env.local</code>.
          </p>
        )}
        {totalVerified === 0 && (
          <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-brand-700">
            Your question bank is empty. Start by{' '}
            <Link href="/ingest" className="font-medium underline">
              ingesting previous-year papers
            </Link>
            {apiKey ? ', or just ask for a quiz and questions will be generated.' : '.'}
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card p-4">
      <div
        className={`text-2xl font-semibold ${
          warn ? 'text-amber-600' : accent ? 'text-brand-600' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}
