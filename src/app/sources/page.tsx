import { redirect } from 'next/navigation';
import { getCategoriesWithSubs } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { listSourceDocuments } from '@/lib/sources';
import { hasApiKey } from '@/lib/claude';
import SourcesManager from '@/components/SourcesManager';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const categories = (await getCategoriesWithSubs()).filter((c) => c.section === 'GS');
  const documents = await listSourceDocuments(user.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Source material</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Add recommended texts (TN State Board IX–XII, Laxmikanth, Ramesh Singh, Arihant TNPSC
          guide…) as PDF or plain text. The app chunks and tags them by category to ground AI
          question generation. Optional — generation falls back to the syllabus + PYQ exemplars when
          no sources exist.
        </p>
      </div>
      {!hasApiKey() && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Reading PDFs and auto-tagging need <code>ANTHROPIC_API_KEY</code>. Plain-text uploads with
          a chosen category work without it.
        </p>
      )}
      <SourcesManager
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        initialDocuments={documents}
      />
    </div>
  );
}
