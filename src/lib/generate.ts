import { all, run, batchWrite, getOrCreateUserId, SHARED_USER_ID } from './db';
import { getCategoriesWithSubs } from './repo';
import { callJson, hasApiKey, webSearchTool } from './claude';
import { questionGeneratorPrompt } from './prompts';
import { TAXONOMY } from './taxonomy';
import type { Difficulty, GeneratedQuestion, Question } from './types';

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
      source: q.source ? String(q.source).slice(0, 200) : undefined,
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
       VALUES (?, 'generated', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'unverified')`,
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
        q.source || null,
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

// Re-exported so other modules can resolve users when needed.
export { getOrCreateUserId };
