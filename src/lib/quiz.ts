import { getDb } from './db';
import { getCategories } from './repo';
import { generateQuestions } from './generate';
import { GS_WEIGHTS, GS_TOTAL, APTITUDE_TOTAL } from './weights';
import type { QuizConfig, Difficulty } from './types';

// Quiz builder (Section 10.2). Selects question ids from the bank (verified
// PYQs first, then generated), topping up with fresh AI generation when the
// bank can't supply enough for a topic.

interface SelectArgs {
  categoryIds: number[]; // empty = any
  subcategoryIds: number[]; // empty = any
  difficulty: Difficulty | 'mixed';
  count: number;
  excludeIds: number[];
}

// Pick eligible question ids from the existing bank.
function selectFromBank(args: SelectArgs): number[] {
  const db = getDb();
  const where: string[] = [
    "verification_status IN ('verified','unverified')",
    'correct_option IS NOT NULL',
  ];
  const params: unknown[] = [];

  if (args.categoryIds.length) {
    where.push(`category_id IN (${args.categoryIds.map(() => '?').join(',')})`);
    params.push(...args.categoryIds);
  }
  if (args.subcategoryIds.length) {
    where.push(`subcategory_id IN (${args.subcategoryIds.map(() => '?').join(',')})`);
    params.push(...args.subcategoryIds);
  }
  if (args.difficulty !== 'mixed') {
    where.push('difficulty = ?');
    params.push(args.difficulty);
  }
  if (args.excludeIds.length) {
    where.push(`id NOT IN (${args.excludeIds.map(() => '?').join(',')})`);
    params.push(...args.excludeIds);
  }

  // Verified PYQs first, then generated/unverified; random within each tier.
  const sql = `SELECT id FROM questions WHERE ${where.join(' AND ')}
    ORDER BY (source_type='pyq' AND verification_status='verified') DESC, RANDOM()
    LIMIT ?`;
  params.push(args.count);
  const rows = db.prepare(sql).all(...params) as { id: number }[];
  return rows.map((r) => r.id);
}

// Resolve slugs -> ids.
function resolveIds(config: QuizConfig) {
  const db = getDb();
  const catIds: number[] = [];
  for (const slug of config.categories) {
    const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as
      | { id: number }
      | undefined;
    if (row) catIds.push(row.id);
  }
  const subIds: number[] = [];
  for (const slug of config.subcategories) {
    const row = db.prepare('SELECT id FROM subcategories WHERE slug = ?').get(slug) as
      | { id: number }
      | undefined;
    if (row) subIds.push(row.id);
  }
  return { catIds, subIds };
}

export interface BuildResult {
  questionIds: number[];
  generatedCount: number;
  shortfall: number; // how many we could not supply at all
}

// Build a PRACTICE quiz: fill from bank, then top up with generation.
export async function buildPracticeQuiz(
  config: QuizConfig,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  const { catIds, subIds } = resolveIds(config);
  let ids = selectFromBank({
    categoryIds: catIds,
    subcategoryIds: subIds,
    difficulty: config.difficulty,
    count: config.count,
    excludeIds: [],
  });

  let generatedCount = 0;
  if (ids.length < config.count && opts.allowGeneration) {
    const need = config.count - ids.length;
    // Generate for the first requested category (or skip if "any").
    const targetSlug = config.categories[0];
    if (targetSlug) {
      try {
        const newIds = await generateQuestions({
          categorySlug: targetSlug,
          subcategorySlug: config.subcategories[0] || null,
          difficulty: config.difficulty,
          count: need,
          useWeb: opts.useWeb,
        });
        generatedCount = newIds.length;
        // Re-select to keep ordering/eligibility consistent.
        const topUp = selectFromBank({
          categoryIds: catIds,
          subcategoryIds: subIds,
          difficulty: config.difficulty,
          count: need,
          excludeIds: ids,
        });
        ids = ids.concat(topUp).slice(0, config.count);
      } catch {
        // Generation failed (no key / API error) — serve what we have.
      }
    }
  }

  return {
    questionIds: ids,
    generatedCount,
    shortfall: Math.max(0, config.count - ids.length),
  };
}

// Build a FULL MOCK: 175 GS distributed by weightage + 25 Aptitude.
export async function buildMockQuiz(opts: {
  allowGeneration: boolean;
  useWeb?: boolean;
}): Promise<BuildResult> {
  const cats = getCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const aptitude = cats.find((c) => c.section === 'APTITUDE');

  const chosen: number[] = [];
  let generatedCount = 0;

  // Largest-remainder rounding of GS weights to exactly GS_TOTAL.
  const targets = computeGsTargets();

  for (const [slug, target] of Object.entries(targets)) {
    const cat = bySlug.get(slug);
    if (!cat) continue;
    const picked = await fillCategory(cat.id, target, chosen, slug, opts.allowGeneration, opts.useWeb);
    chosen.push(...picked.ids);
    generatedCount += picked.generated;
  }

  // Aptitude (25), SSLC standard.
  if (aptitude) {
    const picked = await fillCategory(
      aptitude.id,
      APTITUDE_TOTAL,
      chosen,
      aptitude.slug,
      opts.allowGeneration,
      opts.useWeb
    );
    chosen.push(...picked.ids);
    generatedCount += picked.generated;
  }

  return {
    questionIds: chosen,
    generatedCount,
    shortfall: Math.max(0, GS_TOTAL + APTITUDE_TOTAL - chosen.length),
  };
}

function computeGsTargets(): Record<string, number> {
  const sum = Object.values(GS_WEIGHTS).reduce((a, b) => a + b, 0);
  const raw = Object.entries(GS_WEIGHTS).map(([slug, w]) => ({
    slug,
    exact: (w / sum) * GS_TOTAL,
  }));
  const floored = raw.map((r) => ({ slug: r.slug, n: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
  let remaining = GS_TOTAL - floored.reduce((a, b) => a + b.n, 0);
  floored.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < floored.length && remaining > 0; i++, remaining--) floored[i].n++;
  const out: Record<string, number> = {};
  for (const f of floored) out[f.slug] = f.n;
  return out;
}

async function fillCategory(
  categoryId: number,
  target: number,
  exclude: number[],
  slug: string,
  allowGeneration: boolean,
  useWeb?: boolean
): Promise<{ ids: number[]; generated: number }> {
  let ids = selectFromBank({
    categoryIds: [categoryId],
    subcategoryIds: [],
    difficulty: 'mixed',
    count: target,
    excludeIds: exclude,
  });
  let generated = 0;
  if (ids.length < target && allowGeneration) {
    try {
      const newIds = await generateQuestions({
        categorySlug: slug,
        difficulty: 'mixed',
        count: target - ids.length,
        useWeb,
      });
      generated = newIds.length;
      const topUp = selectFromBank({
        categoryIds: [categoryId],
        subcategoryIds: [],
        difficulty: 'mixed',
        count: target - ids.length,
        excludeIds: [...exclude, ...ids],
      });
      ids = ids.concat(topUp);
    } catch {
      /* serve what we have */
    }
  }
  return { ids: ids.slice(0, target), generated };
}
