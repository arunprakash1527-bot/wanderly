import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { buildPracticeQuiz, buildMockQuiz } from '@/lib/quiz';
import { createSession } from '@/lib/repo';
import { hasApiKey } from '@/lib/claude';
import type { QuizConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Generation + mock building can take a while.
export const maxDuration = 300;

// Build a quiz from a config and create the session.
export async function POST(req: NextRequest) {
  try {
    const { config, allowGeneration = true } = (await req.json()) as {
      config: QuizConfig;
      allowGeneration?: boolean;
    };
    if (!config || !config.mode) return fail('Missing quiz config');

    const gen = allowGeneration && hasApiKey();

    const result =
      config.mode === 'mock'
        ? await buildMockQuiz({ allowGeneration: gen })
        : await buildPracticeQuiz(config, { allowGeneration: gen });

    if (result.questionIds.length === 0) {
      return fail(
        'No questions available yet for that request. Ingest some PYQs first (Ingest PYQs), or set ANTHROPIC_API_KEY to generate questions.',
        409
      );
    }

    const sessionId = createSession({
      mode: config.mode,
      configJson: JSON.stringify(config),
      questionIds: result.questionIds,
    });

    return ok({
      sessionId,
      served: result.questionIds.length,
      generated: result.generatedCount,
      shortfall: result.shortfall,
    });
  } catch (err) {
    return handleError(err);
  }
}
