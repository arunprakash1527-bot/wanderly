import { NextRequest } from 'next/server';
import { ok, handleError } from '@/lib/api';
import {
  accuracyByCategory,
  accuracyBySubcategory,
  volumeByCategory,
  trend,
  type AnalyticsFilter,
} from '@/lib/analytics';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = req.nextUrl.searchParams;
    const filter: AnalyticsFilter = {
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      mode: (sp.get('mode') as 'practice' | 'mock') || undefined,
    };
    const [byCategory, bySubcategory, volume, trendData] = await Promise.all([
      accuracyByCategory(userId, filter),
      accuracyBySubcategory(userId, filter),
      volumeByCategory(userId, filter),
      trend(userId, filter),
    ]);
    return ok({ byCategory, bySubcategory, volume, trend: trendData });
  } catch (err) {
    return handleError(err);
  }
}
