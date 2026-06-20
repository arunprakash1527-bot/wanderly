import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { all, batchWrite } from '@/lib/db';
import { requireUserId } from '@/lib/user';
import type { ExtractedQuestion } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Step 4 — bulk-save reviewed PYQs to this user's bank. Questions with a known
// answer are saved 'verified'; those without are 'unverified' (excluded).
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { questions } = (await req.json()) as { questions: ExtractedQuestion[] };
    if (!Array.isArray(questions) || questions.length === 0) return fail('No questions to save');

    const cats = await all<{ id: number; slug: string }>('SELECT id, slug FROM categories');
    const subs = await all<{ id: number; slug: string }>('SELECT id, slug FROM subcategories');
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
    const subBySlug = new Map(subs.map((s) => [s.slug, s.id]));

    const writes: { sql: string; args: (string | number | null)[] }[] = [];
    let saved = 0;
    let unverified = 0;
    let skipped = 0;

    for (const q of questions) {
      const catId =
        (q.suggested_category && catBySlug.get(q.suggested_category)) ||
        catBySlug.get('indian-polity');
      if (!catId || !q.stem || !q.option_a) {
        skipped++;
        continue;
      }
      const subId = q.suggested_subcategory ? subBySlug.get(q.suggested_subcategory) ?? null : null;
      const correct =
        q.correct_option && ['A', 'B', 'C', 'D'].includes(q.correct_option) ? q.correct_option : null;
      const status = correct ? 'verified' : 'unverified';
      const difficulty = ['easy', 'medium', 'hard'].includes(q.suggested_difficulty as string)
        ? (q.suggested_difficulty as string)
        : 'medium';

      writes.push({
        sql: `INSERT INTO questions
          (user_id, source_type, stem, option_a, option_b, option_c, option_d, correct_option,
           explanation, category_id, subcategory_id, difficulty, year, source_ref, verification_status)
         VALUES (?, 'pyq', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          q.stem,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          correct,
          catId,
          subId,
          difficulty,
          q.year ?? null,
          q.source_ref ?? null,
          status,
        ],
      });
      saved++;
      if (!correct) unverified++;
    }

    if (writes.length) await batchWrite(writes);
    return ok({ saved, unverified, skipped });
  } catch (err) {
    return handleError(err);
  }
}
