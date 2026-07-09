import { ok, handleError } from '@/lib/api';
import { getCategoriesWithSubs, bankStats } from '@/lib/repo';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireUserId();
    const [categories, stats] = await Promise.all([
      getCategoriesWithSubs(),
      bankStats(userId),
    ]);
    return ok({ categories, bankStats: stats });
  } catch (err) {
    return handleError(err);
  }
}
