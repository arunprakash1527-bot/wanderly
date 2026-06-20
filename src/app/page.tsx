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

  return (
    <div className="grid min-h-[68vh] place-items-center">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
          What should we test you on?
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Type it like a search — e.g.{' '}
          <em>&ldquo;25 MCQs on Indian Polity&rdquo;</em> or{' '}
          <em>&ldquo;hard Tamil Nadu history&rdquo;</em>. We&rsquo;ll fill in the details.
        </p>
        <SearchIntake apiKey={hasApiKey()} bankCount={bankCount} />
      </div>
    </div>
  );
}
