import { all, get } from './db';
import { getCategories } from './repo';
import { generateQuestions, generateVariantForConcept } from './generate';
import { GS_WEIGHTS, GS_TOTAL, APTITUDE_TOTAL } from './weights';
import type { QuizConfig, Difficulty } from './types';

// Quiz builder (Section 10.2), per user. Ingested PYQs are reference-only — they
// are never served verbatim; they ground generation as exemplars instead. Quizzes
// reuse previously generated questions from the bank (fast) and top up with fresh
// generation when the bank can't supply enough.

interface SelectArgs {
  userId: number;
  categoryIds: number[];
  subcategoryIds: number[];
  microtopicIds: number[];
  difficulty: Difficulty | 'mixed';
  count: number;
  excludeIds: number[];
}

async function selectFromBank(args: SelectArgs): Promise<number[]> {
  const where: string[] = [
    'user_id = ?',
    // Reference-only PYQs: serve generated questions, never ingested papers verbatim.
    "source_type = 'generated'",
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
  if (args.microtopicIds.length) {
    where.push(`microtopic_id IN (${args.microtopicIds.map(() => '?').join(',')})`);
    params.push(...args.microtopicIds);
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
    ORDER BY RANDOM()
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
  const microIds: number[] = [];
  for (const slug of config.microtopics || []) {
    const row = await get<{ id: number }>('SELECT id FROM microtopics WHERE slug = ?', [slug]);
    if (row) microIds.push(row.id);
  }
  return { catIds, subIds, microIds };
}

export interface BuildResult {
  questionIds: number[];
  generatedCount: number;
  shortfall: number;
}

// Public entry: prefer the concept engine; fall back to the legacy topic builder
// while the concept inventory is still empty for the requested scope.
export async function buildPracticeQuiz(
  userId: number,
  config: QuizConfig,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  const { catIds, subIds, microIds } = await resolveIds(config);
  const scope = conceptScopeClause(catIds, subIds, microIds);
  const conceptCount = Number(
    (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM concepts c WHERE ${scope.clause}`, scope.params))
      ?.n ?? 0
  );
  if (conceptCount > 0) {
    return buildConceptQuiz(userId, config.count, scope, opts.allowGeneration);
  }
  return legacyBuildPractice(userId, config, opts);
}

async function legacyBuildPractice(
  userId: number,
  config: QuizConfig,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  const { catIds, subIds, microIds } = await resolveIds(config);
  let ids = await selectFromBank({
    userId,
    categoryIds: catIds,
    subcategoryIds: subIds,
    microtopicIds: microIds,
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
          microtopicSlug: (config.microtopics || [])[0] || null,
          difficulty: config.difficulty,
          count: need,
          useWeb: opts.useWeb,
        });
        generatedCount = newIds.length;
        const topUp = await selectFromBank({
          userId,
          categoryIds: catIds,
          subcategoryIds: subIds,
          microtopicIds: microIds,
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

// ---- Concept-based selection (spec §4) -------------------------------------

interface ScopeClause {
  clause: string;
  params: (string | number)[];
}

function conceptScopeClause(catIds: number[], subIds: number[], microIds: number[]): ScopeClause {
  if (microIds.length) {
    return { clause: `c.microtopic_id IN (${microIds.map(() => '?').join(',')})`, params: [...microIds] };
  }
  if (subIds.length) {
    return { clause: `c.subcategory_id IN (${subIds.map(() => '?').join(',')})`, params: [...subIds] };
  }
  if (catIds.length) {
    return {
      clause: `c.subcategory_id IN (SELECT id FROM subcategories WHERE category_id IN (${catIds
        .map(() => '?')
        .join(',')}))`,
      params: [...catIds],
    };
  }
  return { clause: '1=1', params: [] };
}

interface ConceptStat {
  id: number;
  pyq_frequency: number;
  attempts: number;
  last_correct: number | null;
  last_session: number | null;
}

function shuffle<T>(arr: T[]): T[] {
  // Index-based jitter (Math.random is fine here; not in workflow scripts).
  return arr
    .map((v) => ({ v, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

// Pick one servable question id for a concept: an unseen variant if any; else
// lazily generate the next variant (cap 3); else any existing variant.
async function questionForConcept(
  userId: number,
  conceptId: number,
  allowGeneration: boolean,
  counters: { generated: number }
): Promise<number | null> {
  // Only GENERATED questions are servable. Ingested PYQs are reference-only —
  // they ground generation but are never shown verbatim in a quiz.
  const variants = await all<{ id: number; variant_number: number }>(
    "SELECT id, variant_number FROM questions WHERE concept_id = ? AND source_type = 'generated' ORDER BY variant_number",
    [conceptId]
  );
  const seen = new Set(
    (
      await all<{ question_id: number }>(
        `SELECT a.question_id FROM attempts a JOIN quiz_sessions s ON s.id = a.session_id
         WHERE s.user_id = ? AND a.concept_id = ?`,
        [userId, conceptId]
      )
    ).map((r) => r.question_id)
  );
  const unseen = variants.find((v) => !seen.has(v.id));
  if (unseen) return unseen.id;

  if (variants.length === 0) {
    if (!allowGeneration) return null;
    const id = await generateVariantForConcept(conceptId, 1);
    if (id) counters.generated++;
    return id;
  }
  if (variants.length < 3 && allowGeneration) {
    const next = Math.max(...variants.map((v) => v.variant_number)) + 1;
    const id = await generateVariantForConcept(conceptId, next);
    if (id) {
      counters.generated++;
      return id;
    }
  }
  return variants[0].id; // fall back to the least-recently-seen variant
}

async function buildConceptQuiz(
  userId: number,
  count: number,
  scope: ScopeClause,
  allowGeneration: boolean
): Promise<BuildResult> {
  const latest = Number(
    (await get<{ m: number }>('SELECT MAX(id) AS m FROM quiz_sessions WHERE user_id = ?', [userId]))?.m ?? 0
  );
  const rows = await all<ConceptStat>(
    `SELECT c.id, c.pyq_frequency AS pyq_frequency,
       (SELECT COUNT(*) FROM attempts a JOIN quiz_sessions s ON s.id=a.session_id
         WHERE s.user_id=? AND a.concept_id=c.id) AS attempts,
       (SELECT a2.is_correct FROM attempts a2 JOIN quiz_sessions s2 ON s2.id=a2.session_id
         WHERE s2.user_id=? AND a2.concept_id=c.id ORDER BY a2.id DESC LIMIT 1) AS last_correct,
       (SELECT MAX(a3.session_id) FROM attempts a3 JOIN quiz_sessions s3 ON s3.id=a3.session_id
         WHERE s3.user_id=? AND a3.concept_id=c.id) AS last_session
     FROM concepts c WHERE ${scope.clause}`,
    [userId, userId, userId, ...scope.params]
  );

  // §4.2 exclusion: skip concepts attempted in the most recent session.
  const pool = rows.filter((r) => latest === 0 || r.last_session !== latest);

  const never = pool
    .filter((r) => Number(r.attempts) === 0)
    .sort((a, b) => Number(b.pyq_frequency) - Number(a.pyq_frequency) || Math.random() - 0.5);
  const wrongDue = shuffle(pool.filter((r) => Number(r.attempts) > 0 && r.last_correct === 0));
  const agingCorrect = shuffle(
    pool.filter(
      (r) => Number(r.attempts) > 0 && r.last_correct === 1 && latest - Number(r.last_session) >= 10
    )
  );

  let picked = [...never, ...wrongDue, ...agingCorrect].slice(0, count);
  if (picked.length < count) {
    // Scope nearly exhausted — fill from anything left (including recent), so the
    // quiz still reaches N. Callers can surface "this scope is nearly exhausted".
    const chosen = new Set(picked.map((p) => p.id));
    picked = picked.concat(rows.filter((r) => !chosen.has(r.id))).slice(0, count);
  }

  const counters = { generated: 0 };
  const questionIds: number[] = [];
  for (const c of picked) {
    const qid = await questionForConcept(userId, c.id, allowGeneration, counters);
    if (qid) questionIds.push(qid);
  }

  return {
    questionIds,
    generatedCount: counters.generated,
    shortfall: Math.max(0, count - questionIds.length),
  };
}

export async function buildMockQuiz(
  userId: number,
  opts: { allowGeneration: boolean; useWeb?: boolean }
): Promise<BuildResult> {
  // Concept-based, blueprint-weighted mock when the inventory exists.
  const haveConcepts = Number(
    (await get<{ n: number }>('SELECT COUNT(*) AS n FROM concepts'))?.n ?? 0
  );
  const haveBlueprint = Number(
    (await get<{ n: number }>('SELECT COUNT(*) AS n FROM blueprint_weights'))?.n ?? 0
  );
  if (haveConcepts > 0 && haveBlueprint > 0) {
    return buildBlueprintMock(userId, opts.allowGeneration);
  }
  return legacyBuildMock(userId, opts);
}

// §6 blueprint-weighted mock: 175 GS proportional to PYQ weights + 25 Aptitude,
// no two questions share a concept.
async function buildBlueprintMock(userId: number, allowGeneration: boolean): Promise<BuildResult> {
  const subs = await all<{ id: number; section: string; weight: number }>(
    `SELECT sc.id AS id, c.section AS section, COALESCE(b.weight, 0) AS weight
     FROM subcategories sc JOIN categories c ON c.id = sc.category_id
     LEFT JOIN blueprint_weights b ON b.subcategory_id = sc.id`
  );
  const gsSubs = subs.filter((s) => s.section === 'GS');
  const aptSubs = subs.filter((s) => s.section === 'APTITUDE');

  const alloc = allocate(gsSubs, GS_TOTAL);
  const aptAlloc = allocate(
    aptSubs.map((s) => ({ ...s, weight: 1 })),
    APTITUDE_TOTAL
  );
  for (const [sid, n] of aptAlloc) alloc.set(sid, (alloc.get(sid) || 0) + n);

  const counters = { generated: 0 };
  const questionIds: number[] = [];
  const usedConcepts = new Set<number>();
  const latest = Number(
    (await get<{ m: number }>('SELECT MAX(id) AS m FROM quiz_sessions WHERE user_id = ?', [userId]))?.m ?? 0
  );

  for (const [subId, target] of alloc) {
    if (target <= 0) continue;
    const rows = await all<ConceptStat>(
      `SELECT c.id, c.pyq_frequency AS pyq_frequency,
         (SELECT COUNT(*) FROM attempts a JOIN quiz_sessions s ON s.id=a.session_id WHERE s.user_id=? AND a.concept_id=c.id) AS attempts,
         (SELECT a2.is_correct FROM attempts a2 JOIN quiz_sessions s2 ON s2.id=a2.session_id WHERE s2.user_id=? AND a2.concept_id=c.id ORDER BY a2.id DESC LIMIT 1) AS last_correct,
         (SELECT MAX(a3.session_id) FROM attempts a3 JOIN quiz_sessions s3 ON s3.id=a3.session_id WHERE s3.user_id=? AND a3.concept_id=c.id) AS last_session
       FROM concepts c WHERE c.subcategory_id = ?`,
      [userId, userId, userId, subId]
    );
    // Breadth first: never-tested, then aging-correct, then wrong-due.
    const never = shuffle(rows.filter((r) => Number(r.attempts) === 0));
    const aging = shuffle(rows.filter((r) => Number(r.attempts) > 0 && r.last_correct === 1));
    const wrong = shuffle(rows.filter((r) => Number(r.attempts) > 0 && r.last_correct === 0));
    const ordered = [...never, ...aging, ...wrong].filter((r) => latest === 0 || r.last_session !== latest);
    let taken = 0;
    for (const c of ordered) {
      if (taken >= target) break;
      if (usedConcepts.has(c.id)) continue;
      const qid = await questionForConcept(userId, c.id, allowGeneration, counters);
      if (qid) {
        usedConcepts.add(c.id);
        questionIds.push(qid);
        taken++;
      }
    }
  }

  return {
    questionIds,
    generatedCount: counters.generated,
    shortfall: Math.max(0, GS_TOTAL + APTITUDE_TOTAL - questionIds.length),
  };
}

// Largest-remainder allocation of `total` across weighted rows.
function allocate(rows: { id: number; weight: number }[], total: number): Map<number, number> {
  const sum = rows.reduce((a, r) => a + Math.max(0, r.weight), 0) || 1;
  const raw = rows.map((r) => ({ id: r.id, exact: (Math.max(0, r.weight) / sum) * total }));
  const out = new Map<number, number>();
  let used = 0;
  for (const r of raw) {
    const n = Math.floor(r.exact);
    out.set(r.id, n);
    used += n;
  }
  raw.sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; i < raw.length && used < total; i++, used++) {
    out.set(raw[i].id, (out.get(raw[i].id) || 0) + 1);
  }
  return out;
}

async function legacyBuildMock(
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
    microtopicIds: [],
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
        microtopicIds: [],
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
