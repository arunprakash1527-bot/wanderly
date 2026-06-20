import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { getCategoriesWithSubs } from '@/lib/repo';
import { callJson, hasApiKey } from '@/lib/claude';
import { intakeParserPrompt } from '@/lib/prompts';
import type { QuizConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Call 1 — intake parser: chat text -> structured quiz config.
export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message?: string };
    if (!message || !message.trim()) return fail('Empty message');

    const cats = getCategoriesWithSubs();
    const validSlugs = new Set(cats.map((c) => c.slug));
    const validSubs = new Set(cats.flatMap((c) => c.subcategories.map((s) => s.slug)));

    // Fallback heuristic parser when no API key is configured (keeps the app
    // usable offline for simple requests).
    if (!hasApiKey()) {
      return ok({ config: heuristicParse(message, cats), source: 'heuristic' });
    }

    const { system, user } = intakeParserPrompt(
      message,
      cats.map((c) => ({ name: c.name, slug: c.slug, subcategories: c.subcategories }))
    );

    const raw = await callJson<QuizConfig>({ system, user, maxTokens: 1024 });

    // Sanitise: clamp, drop unknown slugs.
    const mode = raw.mode === 'mock' ? 'mock' : 'practice';
    const config: QuizConfig = {
      mode,
      categories: mode === 'mock' ? [] : (raw.categories || []).filter((s) => validSlugs.has(s)),
      subcategories:
        mode === 'mock' ? [] : (raw.subcategories || []).filter((s) => validSubs.has(s)),
      difficulty: ['easy', 'medium', 'hard', 'mixed'].includes(raw.difficulty)
        ? raw.difficulty
        : 'mixed',
      count: mode === 'mock' ? 200 : Math.min(100, Math.max(1, Math.round(raw.count || 10))),
      note: typeof raw.note === 'string' ? raw.note : undefined,
    };
    return ok({ config, source: 'ai' });
  } catch (err) {
    return handleError(err);
  }
}

// Distinctive keywords per category slug for the offline fallback. Kept
// deliberately specific so "polity" doesn't also drag in unrelated topics.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'general-science': ['science', 'physics', 'chemistry', 'biology'],
  'current-events': ['current', 'current affairs', 'current events', 'awards', 'sports'],
  geography: ['geography', 'geographic', 'rivers', 'climate'],
  'history-india': ['indian history', 'india history', 'ancient', 'medieval', 'mughal'],
  'history-tamil-nadu': ['tamil nadu history', 'tn history', 'sangam', 'chola', 'pandya', 'pallava'],
  'indian-national-movement': ['national movement', 'freedom struggle', 'independence movement', 'gandhi'],
  'indian-polity': ['polity', 'constitution', 'parliament', 'judiciary', 'fundamental rights'],
  'indian-economy': ['economy', 'economic', 'banking', 'rbi', 'gdp'],
  'tamil-nadu-governance': ['governance', 'welfare scheme', 'administration', 'e-governance'],
  aptitude: ['aptitude', 'mental ability', 'reasoning', 'maths', 'arithmetic'],
};

function heuristicParse(
  message: string,
  cats: { name: string; slug: string; subcategories: { name: string; slug: string }[] }[]
): QuizConfig {
  const text = ' ' + message.toLowerCase() + ' ';
  if (/full mock|mock exam|\b200\b|full test/.test(text)) {
    return { mode: 'mock', categories: [], subcategories: [], difficulty: 'mixed', count: 200, note: 'Full 200-question mock.' };
  }
  const categories = cats
    .filter((c) => (CATEGORY_KEYWORDS[c.slug] || []).some((kw) => text.includes(kw)))
    .map((c) => c.slug);
  const difficulty = /\beasy\b/.test(text)
    ? 'easy'
    : /\bhard\b/.test(text)
      ? 'hard'
      : /\bmedium\b/.test(text)
        ? 'medium'
        : 'mixed';
  // First standalone number in the request is treated as the question count.
  const numMatch = text.match(/\b(\d{1,3})\b/);
  const count = numMatch ? Math.min(100, Math.max(1, parseInt(numMatch[1], 10))) : 10;
  return {
    mode: 'practice',
    categories,
    subcategories: [],
    difficulty: difficulty as QuizConfig['difficulty'],
    count,
    note: 'Parsed offline (no API key set). Add ANTHROPIC_API_KEY for smarter parsing.',
  };
}
