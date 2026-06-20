import { getDb } from './db';
import { getCategoriesWithSubs } from './repo';
import { callJson, hasApiKey, webSearchTool } from './claude';
import { questionGeneratorPrompt } from './prompts';
import { TAXONOMY } from './taxonomy';
import type { Difficulty, GeneratedQuestion, Question } from './types';

// Track 2 — grounded AI question generation (Section 9b/9d).
// Pulls exemplar PYQs + source chunks by category, asks Claude for new MCQs,
// validates the JSON shape, and stores them as unverified generated questions.

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
  categorySlug: string;
  subcategorySlug?: string | null;
  difficulty: Difficulty | 'mixed';
  count: number;
  // Ground generation in real exam-style questions + current facts via web search.
  useWeb?: boolean;
}): Promise<number[]> {
  if (!hasApiKey() || args.count <= 0) return [];
  const db = getDb();
  const cats = getCategoriesWithSubs();
  const category = cats.find((c) => c.slug === args.categorySlug);
  if (!category) return [];

  const seed = TAXONOMY.find((t) => t.slug === args.categorySlug);
  const blurb = seed?.blurb || category.name;
  const subId = args.subcategorySlug
    ? category.subcategories.find((s) => s.slug === args.subcategorySlug)?.id ?? null
    : null;

  // Exemplar PYQs from this category (verified preferred).
  const exemplarRows = db
    .prepare(
      `SELECT * FROM questions WHERE category_id = ? AND source_type='pyq'
       ORDER BY (verification_status='verified') DESC, RANDOM() LIMIT 5`
    )
    .all(category.id) as Question[];
  const exemplars = exemplarRows.map((e) => ({
    stem: e.stem,
    options: [e.option_a, e.option_b, e.option_c, e.option_d],
    correct: e.correct_option,
  }));

  // Source chunks by category (graceful fallback when none exist — Section 9d).
  const chunkRows = db
    .prepare('SELECT chunk_text FROM source_chunks WHERE category_id = ? LIMIT 4')
    .all(category.id) as { chunk_text: string }[];
  const chunks = chunkRows.map((c) => c.chunk_text);

  const { system, user } = questionGeneratorPrompt({
    category: { name: category.name, slug: category.slug, subcategories: category.subcategories },
    subcategorySlug: args.subcategorySlug || null,
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
    // Web grounding can run several searches; give it room and the tool.
    ...(args.useWeb ? { tools: [webSearchTool(5)], maxTokens: 12000 } : {}),
    validate: validateGenerated,
  });

  const insert = db.prepare(
    `INSERT INTO questions
      (source_type, stem, option_a, option_b, option_c, option_d, correct_option,
       explanation, category_id, subcategory_id, difficulty, year, source_ref, verification_status)
     VALUES ('generated', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'AI generated', 'unverified')`
  );
  const ids: number[] = [];
  const tx = db.transaction(() => {
    for (const q of generated) {
      const res = insert.run(
        q.stem,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option,
        q.explanation || null,
        category.id,
        subId,
        q.difficulty
      );
      ids.push(res.lastInsertRowid as number);
    }
  });
  tx();
  return ids;
}
