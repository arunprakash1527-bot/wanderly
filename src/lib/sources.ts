import { all, run, batchWrite } from './db';
import { getCategories } from './repo';
import { callText, callJson, hasApiKey, pdfBlock, textBlock } from './claude';

// Source-document ingestion (Section 9d), per user. No local disk: PDFs are
// transcribed via Claude in-memory and only the chunks are persisted (works on
// serverless / read-only filesystems).

const CHARS_PER_CHUNK = 2800; // ~600-700 tokens

function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const paras = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let buf = '';
  for (const p of paras) {
    if ((buf + '\n\n' + p).length > CHARS_PER_CHUNK && buf) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + '\n\n' + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter((c) => c.length > 40);
}

async function extractPdfText(base64: string): Promise<string> {
  return callText({
    system:
      'You transcribe the readable text of a PDF document. Output the plain text content only — no commentary, no markdown. Preserve paragraph breaks. If the PDF is bilingual, output the English text only.',
    user: [textBlock('Transcribe this document to plain text:'), pdfBlock(base64)],
    maxTokens: 8192,
    temperature: 0,
  });
}

async function autoTagChunks(chunks: string[], categorySlugs: string[]): Promise<(string | null)[]> {
  const sample = chunks.map((c, i) => `[${i}] ${c.slice(0, 300)}`).join('\n\n');
  try {
    const result = await callJson<{ index: number; slug: string | null }[]>({
      system: `Tag each text chunk with the single best-fitting TNPSC GS category slug, or null if none fits. Valid slugs: ${categorySlugs.join(', ')}. Output ONLY a JSON array of {"index":number,"slug":string|null}.`,
      user: sample,
      maxTokens: 2048,
    });
    const map = new Map(result.map((r) => [r.index, r.slug]));
    return chunks.map((_, i) => {
      const slug = map.get(i);
      return slug && categorySlugs.includes(slug) ? slug : null;
    });
  } catch {
    return chunks.map(() => null);
  }
}

export interface IngestSourceArgs {
  userId: number;
  title: string;
  file: File;
  categorySlug: string | null;
}

export async function ingestSource(args: IngestSourceArgs) {
  const buf = Buffer.from(await args.file.arrayBuffer());

  let text: string;
  if (args.file.type === 'application/pdf' || args.file.name.toLowerCase().endsWith('.pdf')) {
    if (!hasApiKey()) throw new Error('ANTHROPIC_API_KEY is required to read PDF source material.');
    text = await extractPdfText(buf.toString('base64'));
  } else {
    text = buf.toString('utf-8');
  }

  return saveSource({
    userId: args.userId,
    title: args.title,
    text,
    categorySlug: args.categorySlug,
  });
}

// Paste path: raw text straight into the reference store. This is the reliable
// way to add material on serverless hosting — it sidesteps the 4.5 MB request
// limit and PDF transcription that large file uploads hit, and the stored
// chunks ground question *generation* (they are never served verbatim).
export async function ingestSourceText(args: {
  userId: number;
  title: string;
  text: string;
  categorySlug: string | null;
}) {
  return saveSource(args);
}

// Shared persistence: chunk -> (optionally auto-tag) -> store as reference.
async function saveSource(args: {
  userId: number;
  title: string;
  text: string;
  categorySlug: string | null;
}) {
  const chunks = chunkText(args.text);
  if (chunks.length === 0) throw new Error('No readable text found in the material.');

  const cats = await getCategories();
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  let tags: (string | null)[];
  if (args.categorySlug) {
    tags = chunks.map(() => args.categorySlug);
  } else if (hasApiKey()) {
    tags = await autoTagChunks(chunks, cats.filter((c) => c.section === 'GS').map((c) => c.slug));
  } else {
    tags = chunks.map(() => null);
  }

  const docCatId = args.categorySlug ? catIdBySlug.get(args.categorySlug) ?? null : null;
  const docRes = await run(
    'INSERT INTO source_documents (user_id, title, category_id, file_path) VALUES (?, ?, ?, NULL)',
    [args.userId, args.title, docCatId]
  );
  const documentId = docRes.lastInsertRowid;

  await batchWrite(
    chunks.map((c, i) => {
      const slug = tags[i];
      return {
        sql: 'INSERT INTO source_chunks (user_id, document_id, category_id, chunk_text) VALUES (?, ?, ?, ?)',
        args: [args.userId, documentId, slug ? catIdBySlug.get(slug) ?? null : null, c],
      };
    })
  );

  return { documentId, chunks: chunks.length };
}

export async function listSourceDocuments(userId: number) {
  return all<{
    id: number;
    title: string;
    ingested_at: string;
    category_name: string | null;
    chunk_count: number;
  }>(
    `SELECT d.id, d.title, d.ingested_at, c.name AS category_name,
            (SELECT COUNT(*) FROM source_chunks sc WHERE sc.document_id = d.id) AS chunk_count
     FROM source_documents d
     LEFT JOIN categories c ON c.id = d.category_id
     WHERE d.user_id = ?
     ORDER BY d.ingested_at DESC`,
    [userId]
  );
}

export async function deleteSourceDocument(userId: number, id: number) {
  await batchWrite([
    { sql: 'DELETE FROM source_chunks WHERE document_id = ? AND user_id = ?', args: [id, userId] },
    { sql: 'DELETE FROM source_documents WHERE id = ? AND user_id = ?', args: [id, userId] },
  ]);
}
