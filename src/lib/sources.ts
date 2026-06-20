import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db';
import { getCategories } from './repo';
import { callText, callJson, hasApiKey, pdfBlock, textBlock } from './claude';

// Source-document ingestion (Section 9d): extract text, chunk (~500-800
// tokens), tag chunks by category (AI-assisted or owner-specified), store.

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
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

async function autoTagChunks(
  chunks: string[],
  categorySlugs: string[]
): Promise<(string | null)[]> {
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
  title: string;
  file: File;
  categorySlug: string | null; // null => auto-detect per chunk
}

export async function ingestSource(args: IngestSourceArgs) {
  const db = getDb();
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const buf = Buffer.from(await args.file.arrayBuffer());
  const safeName = `${Date.now()}-${args.file.name.replace(/[^\w.\-]/g, '_')}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(filePath, buf);

  // Extract text.
  let text: string;
  if (args.file.type === 'application/pdf' || args.file.name.toLowerCase().endsWith('.pdf')) {
    if (!hasApiKey()) throw new Error('ANTHROPIC_API_KEY is required to read PDF source material.');
    text = await extractPdfText(buf.toString('base64'));
  } else {
    text = buf.toString('utf-8');
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error('No readable text found in the document.');

  const cats = getCategories();
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  let tags: (string | null)[];
  if (args.categorySlug) {
    tags = chunks.map(() => args.categorySlug);
  } else if (hasApiKey()) {
    tags = await autoTagChunks(
      chunks,
      cats.filter((c) => c.section === 'GS').map((c) => c.slug)
    );
  } else {
    tags = chunks.map(() => null);
  }

  const docCatId = args.categorySlug ? catIdBySlug.get(args.categorySlug) ?? null : null;

  const tx = db.transaction(() => {
    const docRes = db
      .prepare(
        'INSERT INTO source_documents (title, category_id, file_path) VALUES (?, ?, ?)'
      )
      .run(args.title, docCatId, filePath);
    const docId = docRes.lastInsertRowid as number;
    const insChunk = db.prepare(
      'INSERT INTO source_chunks (document_id, category_id, chunk_text) VALUES (?, ?, ?)'
    );
    chunks.forEach((c, i) => {
      const slug = tags[i];
      insChunk.run(docId, slug ? catIdBySlug.get(slug) ?? null : null, c);
    });
    return docId;
  });
  const documentId = tx();

  return { documentId, chunks: chunks.length };
}

export function listSourceDocuments() {
  return getDb()
    .prepare(
      `SELECT d.id, d.title, d.ingested_at, c.name AS category_name,
              (SELECT COUNT(*) FROM source_chunks sc WHERE sc.document_id = d.id) AS chunk_count
       FROM source_documents d
       LEFT JOIN categories c ON c.id = d.category_id
       ORDER BY d.ingested_at DESC`
    )
    .all() as {
    id: number;
    title: string;
    ingested_at: string;
    category_name: string | null;
    chunk_count: number;
  }[];
}

export function deleteSourceDocument(id: number) {
  getDb().prepare('DELETE FROM source_documents WHERE id = ?').run(id);
}
