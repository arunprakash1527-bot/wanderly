import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { ingestSource, listSourceDocuments, deleteSourceDocument } from '@/lib/sources';
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
    const title = (form.get('title') as string) || (file?.name ?? 'Untitled');
    const categorySlug = (form.get('category') as string) || null;
    if (!file) return fail('No file uploaded');
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
