import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/user';
import CoverageDashboard from '@/components/CoverageDashboard';

export const dynamic = 'force-dynamic';

export default async function CoveragePage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Readiness — syllabus coverage</h1>
        <p className="mt-1 text-sm text-ink-soft">
          How much of the exam’s knowledge space you’ve actually been tested on, and how you’re doing
          within each part. Untested areas are the false-security risk — they show loud.
        </p>
      </div>
      <CoverageDashboard />
    </div>
  );
}
