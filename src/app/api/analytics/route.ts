import { NextRequest } from 'next/server';
import { ok, handleError } from '@/lib/api';
import {
  accuracyByCategory,
  accuracyBySubcategory,
  volumeByCategory,
  trend,
  type AnalyticsFilter,
} from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filter: AnalyticsFilter = {
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      mode: (sp.get('mode') as 'practice' | 'mock') || undefined,
    };
    return ok({
      byCategory: accuracyByCategory(filter),
      bySubcategory: accuracyBySubcategory(filter),
      volume: volumeByCategory(filter),
      trend: trend(filter),
    });
  } catch (err) {
    return handleError(err);
  }
}
