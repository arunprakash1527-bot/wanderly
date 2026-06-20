import { ok, handleError } from '@/lib/api';
import { getCategoriesWithSubs, bankStats } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ categories: getCategoriesWithSubs(), bankStats: bankStats() });
  } catch (err) {
    return handleError(err);
  }
}
