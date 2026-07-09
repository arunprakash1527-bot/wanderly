import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { ingestSource, ingestSourceText, listSourceDocuments, deleteSourceDocument } from '@/lib/sources';
import { requireUserId } from '@/lib/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok({ documents: await listSourceDocuments(userId) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const pasted = ((form.get('text') as string) || '').trim();
    const categorySlug = (form.get('category') as string) || null;

    // Prefer pasted text when provided — it's the reliable, size-unbounded path.
    if (pasted) {
      const title = (form.get('title') as string) || 'Pasted reference';
      const result = await ingestSourceText({
        userId,
        title,
        text: pasted,
        categorySlug: categorySlug || null,
      });
      return ok(result);
    }

    const title = (form.get('title') as string) || (file?.name ?? 'Untitled');
    if (!file) return fail('Paste some text or choose a file first.');
    const result = await ingestSource({ userId, title, file, categorySlug: categorySlug || null });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const id = parseInt(req.nextUrl.searchParams.get('id') || '', 10);
    if (Number.isNaN(id)) return fail('Bad id');
    await deleteSourceDocument(userId, id);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
