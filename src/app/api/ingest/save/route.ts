import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { getDb } from '@/lib/db';
import type { ExtractedQuestion } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Step 4 — bulk-save reviewed PYQs. Questions with a known answer are saved
// 'verified'; those without an answer are 'unverified' and excluded from
// quizzes until fixed.
export async function POST(req: NextRequest) {
  try {
    const { questions } = (await req.json()) as { questions: ExtractedQuestion[] };
    if (!Array.isArray(questions) || questions.length === 0) {
      return fail('No questions to save');
    }

    const db = getDb();
    const catBySlug = new Map(
      (db.prepare('SELECT id, slug FROM categories').all() as { id: number; slug: string }[]).map(
        (c) => [c.slug, c.id]
      )
    );
    const subBySlug = new Map(
      (
        db.prepare('SELECT id, slug FROM subcategories').all() as { id: number; slug: string }[]
      ).map((s) => [s.slug, s.id])
    );

    const insert = db.prepare(
      `INSERT INTO questions
        (source_type, stem, option_a, option_b, option_c, option_d, correct_option,
         explanation, category_id, subcategory_id, difficulty, year, source_ref, verification_status)
       VALUES ('pyq', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
    );

    let saved = 0;
    let unverified = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      for (const q of questions) {
        const catId =
          (q.suggested_category && catBySlug.get(q.suggested_category)) ||
          catBySlug.get('indian-polity'); // fallback so nothing is silently lost
        if (!catId || !q.stem || !q.option_a) {
          skipped++;
          continue;
        }
        const subId = q.suggested_subcategory ? subBySlug.get(q.suggested_subcategory) ?? null : null;
        const correct =
          q.correct_option && ['A', 'B', 'C', 'D'].includes(q.correct_option)
            ? q.correct_option
            : null;
        const status = correct ? 'verified' : 'unverified';
        const difficulty = ['easy', 'medium', 'hard'].includes(q.suggested_difficulty as string)
          ? q.suggested_difficulty
          : 'medium';

        insert.run(
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
          status
        );
        saved++;
        if (!correct) unverified++;
      }
    });
    tx();

    return ok({ saved, unverified, skipped });
  } catch (err) {
    return handleError(err);
  }
}
