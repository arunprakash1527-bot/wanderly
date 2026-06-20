import { redirect } from 'next/navigation';
import { getCategoriesWithSubs } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { hasApiKey } from '@/lib/claude';
import IngestForm from '@/components/IngestForm';

export const dynamic = 'force-dynamic';

export default async function IngestPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const categories = await getCategoriesWithSubs();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ingest previous-year papers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Upload a TNPSC Group 1 Prelims question paper PDF (and its official answer key if you
          have it). The app extracts the questions verbatim — you review, correct the
          category/answer/difficulty, then save them to your verified bank.
        </p>
      </div>
      {!hasApiKey() && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Extraction needs <code>ANTHROPIC_API_KEY</code>. Add it to <code>.env.local</code> and
          restart.
        </p>
      )}
      <IngestForm
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          subcategories: c.subcategories.map((s) => ({ slug: s.slug, name: s.name })),
        }))}
      />
    </div>
  );
}
