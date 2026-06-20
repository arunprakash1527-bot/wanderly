import { all, get } from './db';
import { getCategories } from './repo';
import { generateQuestions } from './generate';
import { GS_WEIGHTS, GS_TOTAL, APTITUDE_TOTAL } from './weights';
import type { QuizConfig, Difficulty } from './types';

// Quiz builder (Section 10.2), per user. Verified PYQs first, then generated,
// topping up with fresh generation when the bank can't supply enough.

interface SelectArgs {
  userId: number;
  categoryIds: number[];
  subcategoryIds: number[];
  difficulty: Difficulty | 'mixed';
  count: number;
  excludeIds: number[];
}

async function selectFromBank(args: SelectArgs): Promise<number[]> {
  const where: string[] = [
    'user_id = ?',
    "verification_status IN ('verified','unverified')",
    'correct_option IS NOT NULL',
  ];
  const params: (string | number)[] = [args.userId];

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

  const sql = `SELECT id FROM questions WHERE ${where.join(' AND ')}
    ORDER BY (source_type='pyq' AND verification_status='verified') DESC, RANDOM()
    LIMIT ?`;
  params.push(args.count);
  const rows = await all<{ id: number }>(sql, params);
  return rows.map((r) => r.id);
}

async function resolveIds(config: QuizConfig) {
  const catIds: number[] = [];
  for (const slug of config.categories) {
    const row = await get<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (row) catIds.push(row.id);
  }
  const subIds: number[] = [];
  for (const slug of config.subcategories) {
    const row = await get<{ id: number }>('SELECT id FROM subcategories WHERE slug = ?', [slug]);
    if (row) subIds.push(row.id);
  }
  return { catIds, subIds };
}

export interface BuildResult {
  questionIds: number[];
  generatedCount: number;
  shortfall: number;
}

export async function buildPracticeQuiz(
  userId: number,
  config: QuizConfig,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  const { catIds, subIds } = await resolveIds(config);
  let ids = await selectFromBank({
    userId,
    categoryIds: catIds,
    subcategoryIds: subIds,
    difficulty: config.difficulty,
    count: config.count,
    excludeIds: [],
  });

  let generatedCount = 0;
  if (ids.length < config.count && opts.allowGeneration) {
    const need = config.count - ids.length;
    const targetSlug = config.categories[0];
    if (targetSlug) {
      try {
        const newIds = await generateQuestions({
          userId,
          categorySlug: targetSlug,
          subcategorySlug: config.subcategories[0] || null,
          difficulty: config.difficulty,
          count: need,
          useWeb: opts.useWeb,
        });
        generatedCount = newIds.length;
        const topUp = await selectFromBank({
          userId,
          categoryIds: catIds,
          subcategoryIds: subIds,
          difficulty: config.difficulty,
          count: need,
          excludeIds: ids,
        });
        ids = ids.concat(topUp).slice(0, config.count);
      } catch {
        /* serve what we have */
      }
    }
  }

  return {
    questionIds: ids,
    generatedCount,
    shortfall: Math.max(0, config.count - ids.length),
  };
}

export async function buildMockQuiz(
  userId: number,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  const cats = await getCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const aptitude = cats.find((c) => c.section === 'APTITUDE');

  const chosen: number[] = [];
  let generatedCount = 0;
  const targets = computeGsTargets();

  for (const [slug, target] of Object.entries(targets)) {
    const cat = bySlug.get(slug);
    if (!cat) continue;
    const picked = await fillCategory(userId, cat.id, target, chosen, slug, opts);
    chosen.push(...picked.ids);
    generatedCount += picked.generated;
  }

  if (aptitude) {
    const picked = await fillCategory(userId, aptitude.id, APTITUDE_TOTAL, chosen, aptitude.slug, opts);
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
  const raw = Object.entries(GS_WEIGHTS).map(([slug, w]) => ({ slug, exact: (w / sum) * GS_TOTAL }));
  const floored = raw.map((r) => ({
    slug: r.slug,
    n: Math.floor(r.exact),
    frac: r.exact - Math.floor(r.exact),
  }));
  let remaining = GS_TOTAL - floored.reduce((a, b) => a + b.n, 0);
  floored.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < floored.length && remaining > 0; i++, remaining--) floored[i].n++;
  const out: Record<string, number> = {};
  for (const f of floored) out[f.slug] = f.n;
  return out;
}

async function fillCategory(
  userId: number,
  categoryId: number,
  target: number,
  exclude: number[],
  slug: string,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<{ ids: number[]; generated: number }> {
  let ids = await selectFromBank({
    userId,
    categoryIds: [categoryId],
    subcategoryIds: [],
    difficulty: 'mixed',
    count: target,
    excludeIds: exclude,
  });
  let generated = 0;
  if (ids.length < target && opts.allowGeneration) {
    try {
      const newIds = await generateQuestions({
        userId,
        categorySlug: slug,
        difficulty: 'mixed',
        count: target - ids.length,
        useWeb: opts.useWeb,
      });
      generated = newIds.length;
      const topUp = await selectFromBank({
        userId,
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
