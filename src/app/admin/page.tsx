import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/user';
import { getCategories } from '@/lib/repo';
import AdminPipeline from '@/components/AdminPipeline';

export const dynamic = 'force-dynamic';

const OWNER = (process.env.OWNER_EMAIL || 'arunprakash1527@gmail.com').toLowerCase();

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  if (user.email.toLowerCase() !== OWNER) {
    return <p className="card p-6 text-sm text-ink-faint">This page is for the app owner only.</p>;
  }
  const categories = (await getCategories()).map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Concept inventory pipeline</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Build the shared concept inventory and generate one question per concept. Run the steps in
          order (or “Run all”). Everything is idempotent and resumable.
        </p>
      </div>
      <AdminPipeline categories={categories} />
    </div>
  );
}
