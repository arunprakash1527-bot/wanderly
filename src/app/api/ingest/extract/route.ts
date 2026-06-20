import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { getCategoriesWithSubs } from '@/lib/repo';
import { requireUserId } from '@/lib/user';
import { callJson, hasApiKey, pdfBlock, textBlock } from '@/lib/claude';
import { pyqExtractorPrompt } from '@/lib/prompts';
import type { ExtractedQuestion } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Call 2 — PYQ extractor: paper PDF -> structured questions (verbatim, JSON).
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    if (!hasApiKey()) {
      return fail('ANTHROPIC_API_KEY is required to extract questions from a PDF.', 503);
    }
    const form = await req.formData();
    const paper = form.get('paper') as File | null;
    const answerKey = form.get('answerKey') as File | null;
    const yearRaw = form.get('year') as string | null;
    const year = yearRaw ? parseInt(yearRaw, 10) : undefined;

    if (!paper) return fail('No paper PDF uploaded');

    const cats = await getCategoriesWithSubs();
    const { system } = pyqExtractorPrompt(
      cats.map((c) => ({ name: c.name, slug: c.slug, subcategories: c.subcategories })),
      Boolean(answerKey),
      Number.isNaN(year as number) ? undefined : year
    );

    const paperB64 = Buffer.from(await paper.arrayBuffer()).toString('base64');
    const content = [
      textBlock('QUESTION PAPER PDF:'),
      pdfBlock(paperB64),
    ];
    if (answerKey) {
      const keyB64 = Buffer.from(await answerKey.arrayBuffer()).toString('base64');
      content.push(textBlock('ANSWER KEY PDF:'), pdfBlock(keyB64));
    }
    content.push(
      textBlock(
        'Extract every question into the JSON array described in the system prompt. Output JSON only.'
      )
    );

    const extracted = await callJson<ExtractedQuestion[]>({
      system,
      user: content,
      maxTokens: 8192,
      validate: (v) => {
        if (!Array.isArray(v)) throw new Error('Expected a JSON array');
        return v as ExtractedQuestion[];
      },
    });

    return ok({ questions: extracted, count: extracted.length });
  } catch (err) {
    return handleError(err);
  }
}
