import { ok, handleError } from '@/lib/api';
import { requireUserId } from '@/lib/user';
import { coverageReport } from '@/lib/coverage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok(await coverageReport(userId));
  } catch (err) {
    return handleError(err);
  }
}
