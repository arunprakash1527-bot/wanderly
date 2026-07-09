import { NextRequest } from 'next/server';
import { ok, handleError } from '@/lib/api';
import { recommendationStats, type AnalyticsFilter } from '@/lib/analytics';
import { requireUserId } from '@/lib/user';
import { callText, hasApiKey } from '@/lib/claude';
import { recommendationPrompt } from '@/lib/prompts';

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
    const stats = await recommendationStats(userId, filter);

    let narrative: string | null = null;
    if (stats.overall.totalAttempts > 0 && hasApiKey()) {
      try {
        const { system, user } = recommendationPrompt(stats);
        narrative = await callText({ system, user, maxTokens: 600, temperature: 0.4 });
      } catch {
        narrative = null;
      }
    }
    return ok({ stats, narrative, hasKey: hasApiKey() });
  } catch (err) {
    return handleError(err);
  }
}
