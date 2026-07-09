import { redirect } from 'next/navigation';
import { getCategoriesWithSubs } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { hasApiKey } from '@/lib/claude';
import { all, SHARED_USER_ID } from '@/lib/db';
import IngestForm from '@/components/IngestForm';
import ImportBank from '@/components/ImportBank';

export const dynamic = 'force-dynamic';

export default async function IngestPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const categories = await getCategoriesWithSubs();

  // Current contents of the shared reference bank, so an import is confirmable.
  const shared = await all<{ name: string; n: number }>(
    `SELECT c.name AS name, COUNT(*) AS n
     FROM questions q JOIN categories c ON c.id = q.category_id
     WHERE q.user_id = ? AND q.source_type = 'pyq'
     GROUP BY c.id ORDER BY n DESC`,
    [SHARED_USER_ID]
  );
  const sharedTotal = shared.reduce((a, s) => a + Number(s.n), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reference question bank</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Add real TNPSC Group 1 Prelims questions here. They&rsquo;re kept as a{' '}
          <strong>shared reference bank</strong> — the app studies their format and difficulty to
          generate fresh questions for <strong>every user</strong>, and never repeats them verbatim.
          Anyone signed in can contribute.
        </p>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-ink-soft">
        <p className="font-medium text-brand-700">
          Shared reference bank: {sharedTotal} question{sharedTotal === 1 ? '' : 's'}
          {shared.length ? ` across ${shared.length} topic${shared.length === 1 ? '' : 's'}` : ''}
        </p>
        {shared.length > 0 && (
          <p className="mt-1">{shared.map((s) => `${s.name}: ${s.n}`).join(' · ')}</p>
        )}
        {sharedTotal === 0 && (
          <p className="mt-1">Empty so far — import your JSON bank below to ground generation.</p>
        )}
      </div>

      {!hasApiKey() && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Generation needs <code>ANTHROPIC_API_KEY</code> set on the server.
        </p>
      )}

      <ImportBank categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-ink-faint">Or extract from a PDF</h2>
        <p className="text-xs text-ink-faint">
          Upload a question-paper PDF to extract questions into the same shared bank. Large or
          scanned PDFs fail on free hosting — prefer the JSON import above.
        </p>
      </div>
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
