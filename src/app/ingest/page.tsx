import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCategoriesWithSubs } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { hasApiKey } from '@/lib/claude';
import IngestForm from '@/components/IngestForm';
import ImportBank from '@/components/ImportBank';

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
          have it). The app extracts the questions <strong>verbatim</strong> — you review, correct
          the category/answer/difficulty, then save them to your verified bank to be served as-is.
        </p>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-ink-soft">
        <p className="font-medium text-brand-700">
          Want fresh questions modelled on your papers, not the same ones repeated?
        </p>
        <p className="mt-1">
          Paste them as reference material on the{' '}
          <Link href="/sources" className="font-medium text-brand-700 underline underline-offset-2">
            Sources
          </Link>{' '}
          page instead. The app keeps them as style references and writes new questions in the same
          pattern when you practise that topic. Pasting also avoids the upload-size limit that large
          PDFs hit on free hosting.
        </p>
      </div>
      {!hasApiKey() && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Extraction needs <code>ANTHROPIC_API_KEY</code>. Add it to <code>.env.local</code> and
          restart.
        </p>
      )}
      <ImportBank categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-ink-faint">Or extract from a PDF</h2>
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
