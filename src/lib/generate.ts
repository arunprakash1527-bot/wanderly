import { all, get, run, batchWrite, getOrCreateUserId, SHARED_USER_ID } from './db';
import { getCategoriesWithSubs } from './repo';
import { callJson, hasApiKey, webSearchTool, GEN_MODEL, VERIFY_MODEL } from './claude';
import { questionGeneratorPrompt, conceptQuestionPrompt, conceptFidelityPrompt } from './prompts';
import { TAXONOMY } from './taxonomy';
import type { Concept, Difficulty, GeneratedQuestion, Option, Question } from './types';

// Track 2 — grounded AI question generation (Section 9b/9d), scoped per user.

function validateGenerated(value: unknown): GeneratedQuestion[] {
  if (!Array.isArray(value)) throw new Error('Expected a JSON array of questions');
  return value.map((v, i) => {
    const q = v as Record<string, unknown>;
    const opt = String(q.correct_option || '').toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(opt)) {
      throw new Error(`Question ${i}: invalid correct_option`);
    }
    if (!q.stem || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
      throw new Error(`Question ${i}: missing stem/options`);
    }
    const diff = ['easy', 'medium', 'hard'].includes(String(q.difficulty))
      ? (q.difficulty as Difficulty)
      : 'medium';
    return {
      stem: String(q.stem),
      option_a: String(q.option_a),
      option_b: String(q.option_b),
      option_c: String(q.option_c),
      option_d: String(q.option_d),
      correct_option: opt as 'A' | 'B' | 'C' | 'D',
      explanation: String(q.explanation || ''),
      difficulty: diff,
      confidence: ['low', 'medium', 'high'].includes(String(q.confidence))
        ? (q.confidence as 'low' | 'medium' | 'high')
        : 'medium',
    };
  });
}

export async function generateQuestions(args: {
  userId: number;
  categorySlug: string;
  subcategorySlug?: string | null;
  microtopicSlug?: string | null;
  difficulty: Difficulty | 'mixed';
  count: number;
  useWeb?: boolean;
}): Promise<number[]> {
  if (!hasApiKey() || args.count <= 0) return [];
  const cats = await getCategoriesWithSubs();
  const category = cats.find((c) => c.slug === args.categorySlug);
  if (!category) return [];

  const seed = TAXONOMY.find((t) => t.slug === args.categorySlug);
  const blurb = seed?.blurb || category.name;
  const subcategory = args.subcategorySlug
    ? category.subcategories.find((s) => s.slug === args.subcategorySlug)
    : undefined;
  const subId = subcategory?.id ?? null;
  // Optional third level — focuses generation and tags the new questions.
  const micro = args.microtopicSlug
    ? subcategory?.microtopics.find((mt) => mt.slug === args.microtopicSlug)
    : undefined;
  const microId = micro?.id ?? null;

  // Exemplars are drawn from the user's own PYQs AND the shared reference bank
  // (user_id = SHARED_USER_ID), so an import by anyone grounds everyone's quizzes.
  const exemplarRows = await all<Question>(
    `SELECT * FROM questions WHERE user_id IN (?, ?) AND category_id = ? AND source_type='pyq'
     ORDER BY (verification_status='verified') DESC, RANDOM() LIMIT 6`,
    [args.userId, SHARED_USER_ID, category.id]
  );
  const exemplars = exemplarRows.map((e) => ({
    stem: e.stem,
    options: [e.option_a, e.option_b, e.option_c, e.option_d],
    correct: e.correct_option,
  }));

  const chunkRows = await all<{ chunk_text: string }>(
    'SELECT chunk_text FROM source_chunks WHERE user_id IN (?, ?) AND category_id = ? LIMIT 4',
    [args.userId, SHARED_USER_ID, category.id]
  );
  const chunks = chunkRows.map((c) => c.chunk_text);

  const { system, user } = questionGeneratorPrompt({
    category: { name: category.name, slug: category.slug, subcategories: category.subcategories },
    subcategorySlug: args.subcategorySlug || null,
    focus: micro?.name || null,
    blurb,
    difficulty: args.difficulty,
    count: args.count,
    exemplars,
    chunks,
    useWeb: args.useWeb,
  });

  const generated = await callJson<GeneratedQuestion[]>({
    system,
    user,
    maxTokens: 8192,
    ...(args.useWeb ? { tools: [webSearchTool(5)], maxTokens: 12000 } : {}),
    validate: validateGenerated,
  });

  if (generated.length === 0) return [];
  await batchWrite(
    generated.map((q) => ({
      sql: `INSERT INTO questions
        (user_id, source_type, stem, option_a, option_b, option_c, option_d, correct_option,
         explanation, category_id, subcategory_id, microtopic_id, difficulty, year, source_ref, verification_status)
       VALUES (?, 'generated', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unverified')`,
      args: [
        args.userId,
        q.stem,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option,
        q.explanation || null,
        category.id,
        subId,
        microId,
        q.difficulty,
      ],
    }))
  );

  // Return the ids of this user's most recent generated rows for this category.
  const ids = await all<{ id: number }>(
    `SELECT id FROM questions WHERE user_id = ? AND category_id = ? AND source_type='generated'
     ORDER BY id DESC LIMIT ?`,
    [args.userId, category.id, generated.length]
  );
  return ids.map((r) => r.id);
}

// ---- Concept-based generation (spec §3): one question per concept ----------

interface OneQ {
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option;
  explanation: string;
}

function validateOneQuestion(value: unknown): OneQ {
  const q = value as Record<string, unknown>;
  const opt = String(q.correct_option || '').toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(opt)) throw new Error('bad correct_option');
  if (!q.stem || !q.option_a || !q.option_b || !q.option_c || !q.option_d) throw new Error('missing fields');
  return {
    stem: String(q.stem),
    option_a: String(q.option_a),
    option_b: String(q.option_b),
    option_c: String(q.option_c),
    option_d: String(q.option_d),
    correct_option: opt as Option,
    explanation: String(q.explanation || ''),
  };
}

// Answer-verification self-check (§3.3). ON by default — for exam prep a wrong
// answer key is unacceptable, so we independently re-solve each question and
// reject it if the marked answer is wrong (or ambiguous / off-concept). It
// roughly doubles generation cost; set CONCEPT_FIDELITY_CHECK=0 to disable.
const FIDELITY_CHECK = process.env.CONCEPT_FIDELITY_CHECK !== '0';

// Cost control (§token-budget): generate at most this many questions per
// micro-topic, choosing the concepts TNPSC tests most (highest pyq_frequency).
// This caps a ~6,500-concept inventory down to a bounded, exam-focused set
// (K=6 over ~178 micro-topics ≈ ~1,100 questions) instead of one question for
// every atomic fact. The long tail still generates lazily if a quiz needs it.
// Tune with MAX_CONCEPTS_PER_MICROTOPIC (0 = no cap, generate everything).
const MAX_PER_MICRO = (() => {
  const raw = process.env.MAX_CONCEPTS_PER_MICROTOPIC;
  if (raw === undefined) return 6;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 6;
})();

// Last reason a generation attempt ended (surfaced in the admin log for debugging).
let lastGenNote = 'idle';
export function generationNote(): string {
  return lastGenNote;
}

// Generate one variant for a concept. Returns the new question id, or null.
export async function generateVariantForConcept(
  conceptId: number,
  variantNumber = 1
): Promise<number | null> {
  if (!hasApiKey()) {
    lastGenNote = 'no-api-key';
    return null;
  }
  const concept = await get<Concept>('SELECT * FROM concepts WHERE id = ?', [conceptId]);
  if (!concept) {
    lastGenNote = 'no-concept';
    return null;
  }
  const sub = await get<{ category_id: number }>('SELECT category_id FROM subcategories WHERE id = ?', [
    concept.subcategory_id,
  ]);
  if (!sub) {
    lastGenNote = 'no-subcategory';
    return null;
  }

  // Defence-in-depth: never pay for generate+verify if this concept already has
  // a generated question. The unique (concept_id, variant_number) index would
  // reject the insert anyway, so without this guard an over-selection bug would
  // silently burn API calls every loop (as happened when a correlated NOT EXISTS
  // bound to questions.id instead of the concept id).
  const already = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM questions WHERE concept_id = ? AND source_type='generated'",
    [conceptId]
  );
  if (Number(already?.n ?? 0) > 0) {
    lastGenNote = 'already-generated';
    return null;
  }

  const existing = await all<{ stem: string }>('SELECT stem FROM questions WHERE concept_id = ?', [
    conceptId,
  ]);
  // Real PYQ exemplars from the same subject, so the generated question mirrors
  // the actual TNPSC format/phrasing (statement-evaluation, match-the-following…).
  const exemplarRows = await all<Question>(
    `SELECT * FROM questions WHERE source_type='pyq' AND category_id = ?
     ORDER BY RANDOM() LIMIT 3`,
    [sub.category_id]
  );
  const exemplars = exemplarRows.map((e) => ({
    stem: e.stem,
    options: [e.option_a, e.option_b, e.option_c, e.option_d],
    correct: e.correct_option,
  }));
  const { system, user } = conceptQuestionPrompt(
    concept.statement,
    concept.difficulty,
    existing.map((e) => e.stem),
    exemplars
  );

  let q: OneQ | undefined;
  for (let attempt = 0; attempt < 2 && !q; attempt++) {
    let candidate: OneQ;
    try {
      candidate = await callJson<OneQ>({ system, user, model: GEN_MODEL, maxTokens: 1500, validate: validateOneQuestion });
    } catch (e) {
      lastGenNote = 'gen-fail: ' + String(e instanceof Error ? e.message : e).slice(0, 160);
      continue;
    }
    if (!FIDELITY_CHECK) {
      q = candidate;
      break;
    }
    try {
      const fp = conceptFidelityPrompt(concept.statement, candidate);
      const fid = await callJson<{
        answer_correct: boolean;
        single_correct: boolean;
        tests_concept: boolean;
      }>({ system: fp.system, user: fp.user, model: VERIFY_MODEL, maxTokens: 600 });
      if (fid.answer_correct && fid.single_correct && fid.tests_concept) q = candidate;
      else
        lastGenNote =
          'verify-rejected: ' +
          (!fid.answer_correct ? 'wrong-answer' : !fid.single_correct ? 'ambiguous' : 'off-concept');
    } catch {
      // If the checker itself errors (infra), accept the candidate rather than
      // lose the question — a rare hiccup, not a correctness signal.
      q = candidate;
    }
  }
  if (!q) return null;

  try {
    const r = await run(
    `INSERT OR IGNORE INTO questions
       (user_id, source_type, stem, option_a, option_b, option_c, option_d, correct_option,
        explanation, category_id, subcategory_id, microtopic_id, concept_id, variant_number,
        difficulty, year, source_ref, verification_status)
     VALUES (?, 'generated', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'verified')`,
    [
      SHARED_USER_ID,
      q.stem,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation || null,
      sub.category_id,
      concept.subcategory_id,
      concept.microtopic_id,
      conceptId,
      variantNumber,
      concept.difficulty,
    ]
    );
    lastGenNote = r.lastInsertRowid ? 'ok' : 'insert-ignored';
    return r.lastInsertRowid || null;
  } catch (e) {
    lastGenNote = 'insert-fail: ' + String(e instanceof Error ? e.message : e).slice(0, 160);
    return null;
  }
}

// Optionally restrict generation to one category (by slug).
function categoryFilter(categorySlug?: string | null): { clause: string; param: string[] } {
  return categorySlug
    ? {
        clause:
          'AND c.subcategory_id IN (SELECT id FROM subcategories WHERE category_id = (SELECT id FROM categories WHERE slug = ?))',
        param: [categorySlug],
      }
    : { clause: '', param: [] };
}

// Delete generated questions (optionally within one category) so they can be
// regenerated — e.g. after improving the generation prompt. PYQ rows are kept.
export async function clearGeneratedForCategory(categorySlug?: string | null): Promise<number> {
  if (!categorySlug) {
    const r = await run("DELETE FROM questions WHERE source_type='generated'");
    return r.rowsAffected;
  }
  const r = await run(
    `DELETE FROM questions WHERE source_type='generated'
     AND category_id = (SELECT id FROM categories WHERE slug = ?)`,
    [categorySlug]
  );
  return r.rowsAffected;
}

// How many concepts still lack a question (optionally within one category).
export async function conceptsWithoutVariantCount(categorySlug?: string | null): Promise<number> {
  const f = categoryFilter(categorySlug);
  if (MAX_PER_MICRO === 0) {
    const r = await get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM concepts c
       WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.concept_id = c.id AND q.source_type='generated') ${f.clause}`,
      f.param
    );
    return Number(r?.n ?? 0);
  }
  // Only the top-K concepts per micro-topic count as "remaining" so the pipeline
  // loop terminates at the capped target rather than the full inventory.
  // NOTE: alias the concept id as `cid` (a name the `questions` table lacks) so
  // the correlated NOT EXISTS binds to the concept, not to `q.id`. Using bare
  // `id` silently resolves to questions.id and matches nothing.
  const r = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM (
       SELECT c.id AS cid,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(c.microtopic_id, -c.subcategory_id)
           ORDER BY c.pyq_frequency DESC, c.id
         ) AS rnk
       FROM concepts c
       WHERE 1=1 ${f.clause}
     )
     WHERE rnk <= ?
       AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.concept_id = cid AND q.source_type='generated')`,
    [...f.param, MAX_PER_MICRO]
  );
  return Number(r?.n ?? 0);
}

// The capped generation target: how many concepts will actually get a question
// (top-K per micro-topic), so the UI can show ~1,100 rather than the full
// inventory. With no cap this equals the total concept count.
export async function cappedGenerationTarget(categorySlug?: string | null): Promise<number> {
  const f = categoryFilter(categorySlug);
  if (MAX_PER_MICRO === 0) {
    const r = await get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM concepts c WHERE 1=1 ${f.clause}`,
      f.param
    );
    return Number(r?.n ?? 0);
  }
  const r = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM (
       SELECT c.id AS id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(c.microtopic_id, -c.subcategory_id)
           ORDER BY c.pyq_frequency DESC, c.id
         ) AS rnk
       FROM concepts c
       WHERE 1=1 ${f.clause}
     )
     WHERE rnk <= ?`,
    [...f.param, MAX_PER_MICRO]
  );
  return Number(r?.n ?? 0);
}

export const maxConceptsPerMicrotopic = MAX_PER_MICRO;

// Generate variant 1 for the next `limit` concepts that have none (exam-favoured
// concepts first). Used by the admin pipeline and lazily by quiz building.
// Pass categorySlug to scope generation to one subject.
export async function generateVariantsNextBatch(
  limit: number,
  categorySlug?: string | null
): Promise<{ processed: number; created: number; note: string }> {
  // Breadth-first: rank concepts within each micro-topic (PYQ-relevant first),
  // then take rank 1 across ALL micro-topics before rank 2, etc. This way a
  // partial run still gives at least one question in every topic — even coverage
  // rather than fully finishing a few topics and leaving others empty.
  const f = categoryFilter(categorySlug);
  // Rank ALL concepts within each micro-topic by PYQ frequency, then keep the
  // top-K (the exam-worthy head) and, among those, the ones still lacking a
  // question. Breadth-first (rnk, id) so a partial run gives at least one
  // question in every topic before deepening any single one.
  const capClause = MAX_PER_MICRO === 0 ? '' : 'WHERE rnk <= ?';
  const capParam = MAX_PER_MICRO === 0 ? [] : [MAX_PER_MICRO];
  // `cid` (not `id`) so the correlated NOT EXISTS binds to the concept, not to
  // questions.id — see conceptsWithoutVariantCount for the same subtlety.
  const concepts = await all<{ id: number }>(
    `SELECT cid AS id FROM (
       SELECT c.id AS cid,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(c.microtopic_id, -c.subcategory_id)
           ORDER BY c.pyq_frequency DESC, c.id
         ) AS rnk
       FROM concepts c
       WHERE 1=1 ${f.clause}
     )
     ${capClause} ${capClause ? 'AND' : 'WHERE'} NOT EXISTS
       (SELECT 1 FROM questions q WHERE q.concept_id = cid AND q.source_type='generated')
     ORDER BY rnk, cid LIMIT ?`,
    [...f.param, ...capParam, limit]
  );
  let created = 0;
  for (const c of concepts) {
    const id = await generateVariantForConcept(c.id, 1);
    if (id) created++;
  }
  return { processed: concepts.length, created, note: lastGenNote };
}

// Re-exported so other modules can resolve users when needed.
export { getOrCreateUserId };
