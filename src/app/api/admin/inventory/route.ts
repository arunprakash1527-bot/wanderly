import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { currentUser } from '@/lib/user';
import { hasApiKey } from '@/lib/claude';
import {
  inventoryStatus,
  decomposeNextBatch,
  mapPyqNextBatch,
  validateNextBatch,
  subcategoriesPendingValidation,
  computeBlueprint,
  sampleConcepts,
} from '@/lib/concepts';
import { generateVariantsNextBatch } from '@/lib/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // clamped to 60 on Hobby; batches are sized for it.

const OWNER = (process.env.OWNER_EMAIL || 'arunprakash1527@gmail.com').toLowerCase();

async function requireOwner() {
  const u = await currentUser();
  if (!u) throw new Error('UNAUTHORIZED');
  if (u.email.toLowerCase() !== OWNER) throw new Error('FORBIDDEN');
}

async function remainingFor(step: string): Promise<number> {
  const s = await inventoryStatus();
  switch (step) {
    case 'decompose':
      return s.microtopicsTotal - s.microtopicsDecomposed;
    case 'mappyq':
      return s.pyqUnmapped;
    case 'validate':
      return subcategoriesPendingValidation();
    case 'generate':
      return s.conceptsWithoutVariant;
    default:
      return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireOwner();
    const sample = req.nextUrl.searchParams.get('sample');
    if (sample) return ok({ concepts: await sampleConcepts(parseInt(sample, 10) || 25) });
    return ok({
      status: await inventoryStatus(),
      pendingValidation: await subcategoriesPendingValidation(),
      hasApiKey: hasApiKey(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') return fail('Owner only.', 403);
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireOwner();
    if (!hasApiKey()) return fail('ANTHROPIC_API_KEY is required to build the inventory.', 503);
    const { step, batch = 3 } = (await req.json()) as { step: string; batch?: number };
    const n = Math.max(1, Math.min(20, Number(batch) || 3));

    let result: unknown;
    switch (step) {
      case 'decompose':
        result = await decomposeNextBatch(n);
        break;
      case 'mappyq':
        result = await mapPyqNextBatch(Math.max(n, 8));
        break;
      case 'validate':
        result = await validateNextBatch(Math.min(4, n));
        break;
      case 'blueprint':
        result = await computeBlueprint();
        break;
      case 'generate':
        result = await generateVariantsNextBatch(n);
        break;
      default:
        return fail('Unknown step.');
    }
    return ok({ step, result, remaining: await remainingFor(step) });
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') return fail('Owner only.', 403);
    return handleError(err);
  }
}
