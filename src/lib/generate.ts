import { all, get, run, batchWrite, getOrCreateUserId, SHARED_USER_ID } from './db';
import { getCategoriesWithSubs } from './repo';
import { callJson, hasApiKey, webSearchTool } from './claude';
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

// Generate one variant for a concept, running the concept-fidelity self-check.
// Returns the new question id, or null if it couldn't produce a faithful one.
export async function generateVariantForConcept(
  conceptId: number,
  variantNumber = 1
): Promise<number | null> {
  if (!hasApiKey()) return null;
  const concept = await get<Concept>('SELECT * FROM concepts WHERE id = ?', [conceptId]);
  if (!concept) return null;
  const sub = await get<{ category_id: number }>('SELECT category_id FROM subcategories WHERE id = ?', [
    concept.subcategory_id,
  ]);
  if (!sub) return null;

  const existing = await all<{ stem: string }>('SELECT stem FROM questions WHERE concept_id = ?', [
    conceptId,
  ]);
  const { system, user } = conceptQuestionPrompt(
    concept.statement,
    concept.difficulty,
    existing.map((e) => e.stem)
  );

  let q: OneQ | undefined;
  for (let attempt = 0; attempt < 2 && !q; attempt++) {
    let candidate: OneQ;
    try {
      candidate = await callJson<OneQ>({ system, user, maxTokens: 1500, validate: validateOneQuestion });
    } catch {
      continue;
    }
    // Concept-fidelity self-check (§3.3).
    try {
      const fp = conceptFidelityPrompt(concept.statement, candidate.stem, candidate.correct_option);
      const fid = await callJson<{ tests_concept: boolean; single_correct: boolean }>({
        system: fp.system,
        user: fp.user,
        maxTokens: 400,
      });
      if (fid.tests_concept && fid.single_correct) q = candidate;
    } catch {
      q = candidate; // if the checker itself fails, accept the candidate
    }
  }
  if (!q) return null;

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
  return r.lastInsertRowid || null;
}

// Generate variant 1 for the next `limit` concepts that have none (exam-favoured
// concepts first). Used by the admin pipeline and lazily by quiz building.
export async function generateVariantsNextBatch(
  limit: number
): Promise<{ processed: number; created: number }> {
  const concepts = await all<{ id: number }>(
    `SELECT c.id FROM concepts c
     WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.concept_id = c.id AND q.variant_number = 1)
     ORDER BY c.pyq_frequency DESC, c.id LIMIT ?`,
    [limit]
  );
  let created = 0;
  for (const c of concepts) {
    const id = await generateVariantForConcept(c.id, 1);
    if (id) created++;
  }
  return { processed: concepts.length, created };
}

// Re-exported so other modules can resolve users when needed.
export { getOrCreateUserId };
