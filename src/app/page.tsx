import { hasApiKey } from '@/lib/claude';
import { currentUser } from '@/lib/user';
import { bankStats } from '@/lib/repo';
import SearchIntake from '@/components/SearchIntake';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await currentUser();
  const stats = user ? await bankStats(user.id) : [];
  const bankCount = stats.reduce(
    (a, s) => a + Number(s.pyq_verified || 0) + Number(s.generated || 0),
    0
  );
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="relative">
      {/* soft decorative backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-gradient-to-b from-brand-100/70 to-transparent blur-3xl"
      />
      <div className="grid min-h-[66vh] place-items-center">
        <div className="w-full max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-faint/15 bg-white/70 px-3 py-1 text-xs font-medium text-ink-soft shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            TNPSC Group 1 Prelims · 200 MCQs · 1.5/correct · no negative marking
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {firstName ? `What should we test you on, ${firstName}?` : 'What should we test you on?'}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Type it like a search — <em>&ldquo;25 MCQs on Indian Polity&rdquo;</em>,{' '}
            <em>&ldquo;hard Tamil Nadu history&rdquo;</em>, or <em>&ldquo;full mock exam&rdquo;</em>.
            We&rsquo;ll fill in the rest.
          </p>

          <SearchIntake apiKey={hasApiKey()} bankCount={bankCount} />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-faint">
            <Feature>⚡ Instant AI-generated MCQs</Feature>
            <Feature>📄 Ingest real previous-year papers</Feature>
            <Feature>📊 Per-topic analytics &amp; study plan</Feature>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1">{children}</span>;
}
