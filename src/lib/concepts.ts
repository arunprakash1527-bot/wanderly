import { all, get, run, batchWrite } from './db';
import { callJson } from './claude';
import {
  conceptDecompositionPrompt,
  pyqConceptMappingPrompt,
  conceptValidationPrompt,
} from './prompts';
import { TAXONOMY } from './taxonomy';
import type { ConceptType, Difficulty } from './types';

// Concept inventory pipeline (spec §2). All steps are idempotent and run in
// small batches so they fit inside a serverless request; the admin endpoint
// calls them repeatedly until each step reports "done".

const TYPES: ConceptType[] = [
  'fact', 'date', 'person', 'place', 'definition', 'process', 'relationship', 'data', 'provision',
];
const asType = (v: unknown): ConceptType =>
  TYPES.includes(String(v) as ConceptType) ? (String(v) as ConceptType) : 'fact';
const asDiff = (v: unknown): Difficulty =>
  ['easy', 'medium', 'hard'].includes(String(v)) ? (String(v) as Difficulty) : 'medium';

// ---- progress --------------------------------------------------------------

export interface InventoryStatus {
  microtopicsTotal: number;
  microtopicsDecomposed: number;
  conceptsTotal: number;
  pyqTotal: number;
  pyqUnmapped: number;
  conceptsWithoutVariant: number;
  blueprintRows: number;
}

export async function inventoryStatus(): Promise<InventoryStatus> {
  const one = async (sql: string) => Number((await get<{ n: number }>(sql))?.n ?? 0);
  return {
    microtopicsTotal: await one('SELECT COUNT(*) AS n FROM microtopics'),
    microtopicsDecomposed: await one(
      'SELECT COUNT(DISTINCT microtopic_id) AS n FROM concepts WHERE microtopic_id IS NOT NULL'
    ),
    conceptsTotal: await one('SELECT COUNT(*) AS n FROM concepts'),
    pyqTotal: await one("SELECT COUNT(*) AS n FROM questions WHERE source_type='pyq'"),
    pyqUnmapped: await one(
      "SELECT COUNT(*) AS n FROM questions WHERE source_type='pyq' AND concept_id IS NULL"
    ),
    conceptsWithoutVariant: await one(
      `SELECT COUNT(*) AS n FROM concepts c
       WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.concept_id = c.id AND q.source_type='generated')`
    ),
    blueprintRows: await one('SELECT COUNT(*) AS n FROM blueprint_weights'),
  };
}

// One-off cleanup: remove duplicate PYQ rows (from double-imports) and junk
// placeholder concepts created by pipeline fallbacks, plus any questions on them.
export async function cleanupInventory(): Promise<{
  duplicatePyqRemoved: number;
  junkConceptsRemoved: number;
}> {
  // 1. Duplicate PYQ rows — keep the lowest id per identical stem.
  const dup = await run(
    `DELETE FROM questions
     WHERE source_type='pyq'
       AND id NOT IN (SELECT MIN(id) FROM questions WHERE source_type='pyq' GROUP BY stem)`
  );
  // 2. Junk/placeholder concepts and their questions.
  const patterns = ['Fact tested by PYQ #%', 'Unmapped PYQ fact%', 'Key facts about %'];
  let junk = 0;
  for (const p of patterns) {
    const ids = await all<{ id: number }>('SELECT id FROM concepts WHERE statement LIKE ?', [p]);
    for (const { id } of ids) {
      await run('DELETE FROM questions WHERE concept_id = ?', [id]);
      await run('DELETE FROM concepts WHERE id = ?', [id]);
      junk++;
    }
  }
  return { duplicatePyqRemoved: dup.rowsAffected, junkConceptsRemoved: junk };
}

// A random sample of concepts, for the owner to spot-check quality before the
// expensive generation step.
export async function sampleConcepts(n: number) {
  return all<{
    statement: string;
    concept_type: string;
    source: string;
    pyq_frequency: number;
    subcategory: string;
    microtopic: string | null;
    has_question: number;
  }>(
    `SELECT c.statement, c.concept_type, c.source, c.pyq_frequency,
            sc.name AS subcategory, mt.name AS microtopic,
            (SELECT COUNT(*) FROM questions q WHERE q.concept_id = c.id) AS has_question
     FROM concepts c
     JOIN subcategories sc ON sc.id = c.subcategory_id
     LEFT JOIN microtopics mt ON mt.id = c.microtopic_id
     ORDER BY RANDOM() LIMIT ?`,
    [Math.max(1, Math.min(100, n))]
  );
}

// ---- Source B: syllabus decomposition --------------------------------------

interface MicroRow {
  id: number;
  micro_name: string;
  subcategory_id: number;
  sub_name: string;
  cat_name: string;
  cat_slug: string;
}

// Decompose the next `limit` micro-topics that have no concepts yet.
export async function decomposeNextBatch(limit: number): Promise<{ processed: number; inserted: number }> {
  const rows = await all<MicroRow>(
    `SELECT m.id, m.name AS micro_name, m.subcategory_id,
            sc.name AS sub_name, c.name AS cat_name, c.slug AS cat_slug
     FROM microtopics m
     JOIN subcategories sc ON sc.id = m.subcategory_id
     JOIN categories c ON c.id = sc.category_id
     WHERE NOT EXISTS (SELECT 1 FROM concepts co WHERE co.microtopic_id = m.id)
     LIMIT ?`,
    [limit]
  );
  let inserted = 0;
  for (const mt of rows) {
    const blurb = TAXONOMY.find((t) => t.slug === mt.cat_slug)?.blurb || '';
    const { system, user } = conceptDecompositionPrompt(
      mt.micro_name,
      `${mt.cat_name} > ${mt.sub_name}. ${blurb}`
    );
    try {
      const items = await callJson<{ statement: string; concept_type: string; difficulty: string }[]>({
        system,
        user,
        maxTokens: 4096,
        validate: (v) => {
          if (!Array.isArray(v)) throw new Error('expected array');
          return v as { statement: string; concept_type: string; difficulty: string }[];
        },
      });
      const writes = items
        .filter((it) => it && typeof it.statement === 'string' && it.statement.trim().length > 8)
        .map((it) => ({
          sql: `INSERT OR IGNORE INTO concepts
                 (subcategory_id, microtopic_id, statement, concept_type, difficulty, source)
               VALUES (?, ?, ?, ?, ?, 'syllabus_decomposition')`,
          args: [mt.subcategory_id, mt.id, it.statement.trim(), asType(it.concept_type), asDiff(it.difficulty)],
        }));
      if (writes.length) await batchWrite(writes);
      inserted += writes.length;
    } catch {
      // Insert a single placeholder so this micro-topic isn't retried forever;
      // the validation pass can clean up. Keeps the batch loop making progress.
      await run(
        `INSERT OR IGNORE INTO concepts (subcategory_id, microtopic_id, statement, concept_type, difficulty, source)
         VALUES (?, ?, ?, 'fact', 'medium', 'syllabus_decomposition')`,
        [mt.subcategory_id, mt.id, `Key facts about ${mt.micro_name} (${mt.sub_name}).`]
      );
    }
  }
  return { processed: rows.length, inserted };
}

// ---- Source A: PYQ mapping -------------------------------------------------

export async function mapPyqNextBatch(limit: number): Promise<{ processed: number }> {
  const subs = await all<{ slug: string; id: number; category_id: number }>(
    'SELECT slug, id, category_id FROM subcategories ORDER BY id'
  );
  const subIdBySlug = new Map(subs.map((s) => [s.slug, s.id]));
  // First subcategory of each category — a guaranteed fallback so a PYQ that the
  // model can't map (or that has no subcategory) still gets linked and won't loop.
  const firstSubOfCat = new Map<number, number>();
  for (const s of subs) if (!firstSubOfCat.has(s.category_id)) firstSubOfCat.set(s.category_id, s.id);
  const { system } = pyqConceptMappingPrompt(subs.map((s) => s.slug));

  const questions = await all<{
    id: number;
    stem: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string | null;
    subcategory_id: number | null;
    category_id: number;
  }>(
    `SELECT id, stem, option_a, option_b, option_c, option_d, correct_option, subcategory_id, category_id
     FROM questions WHERE source_type='pyq' AND concept_id IS NULL LIMIT ?`,
    [limit]
  );

  const fallbackSub = (q: { subcategory_id: number | null; category_id: number }): number | null =>
    q.subcategory_id ?? firstSubOfCat.get(q.category_id) ?? null;

  for (const q of questions) {
    const userMsg = `Question: ${q.stem}
A) ${q.option_a}
B) ${q.option_b}
C) ${q.option_c}
D) ${q.option_d}
Correct: ${q.correct_option ?? 'unknown'}`;
    try {
      const m = await callJson<{
        subcategory_slug: string;
        statement: string;
        concept_type: string;
        difficulty: string;
      }>({ system, user: userMsg, maxTokens: 700 });
      const subId = subIdBySlug.get(m.subcategory_slug) ?? fallbackSub(q);
      let statement = (m.statement || '').trim();
      if (!subId) continue; // no category at all (shouldn't happen) — leave for retry
      if (statement.length < 8) statement = `Key fact tested by PYQ #${q.id}.`;
      const existing = await get<{ id: number }>(
        'SELECT id FROM concepts WHERE subcategory_id = ? AND statement = ?',
        [subId, statement]
      );
      let conceptId: number;
      if (existing) {
        conceptId = existing.id;
        await run('UPDATE concepts SET pyq_frequency = pyq_frequency + 1 WHERE id = ?', [conceptId]);
      } else {
        const r = await run(
          `INSERT INTO concepts (subcategory_id, microtopic_id, statement, concept_type, difficulty, pyq_frequency, source)
           VALUES (?, NULL, ?, ?, ?, 1, 'pyq_mapping')`,
          [subId, statement, asType(m.concept_type), asDiff(m.difficulty)]
        );
        conceptId = r.lastInsertRowid;
      }
      // variant_number 0 = reference-only PYQ (not a servable quiz variant).
      await run('UPDATE questions SET concept_id = ?, variant_number = 0 WHERE id = ?', [conceptId, q.id]);
    } catch {
      // Link to a fallback concept so it isn't retried endlessly.
      const subId = fallbackSub(q);
      if (subId) {
        const stmt = `Fact tested by PYQ #${q.id}.`;
        const r = await run(
          `INSERT OR IGNORE INTO concepts (subcategory_id, microtopic_id, statement, concept_type, difficulty, pyq_frequency, source)
           VALUES (?, NULL, ?, 'fact', 'medium', 1, 'pyq_mapping')`,
          [subId, stmt]
        );
        const cid =
          r.lastInsertRowid ||
          (await get<{ id: number }>('SELECT id FROM concepts WHERE subcategory_id=? AND statement=?', [
            subId,
            stmt,
          ]))?.id;
        if (cid) await run('UPDATE questions SET concept_id = ? WHERE id = ?', [cid, q.id]);
      }
    }
  }
  return { processed: questions.length };
}

// ---- Validation pass (dedupe / delete) -------------------------------------

export async function validateNextBatch(limit: number): Promise<{ processed: number; changes: number }> {
  // Subcategories that have concepts and aren't yet marked validated.
  const subs = await all<{ id: number; name: string }>(
    `SELECT sc.id, sc.name FROM subcategories sc
     WHERE EXISTS (SELECT 1 FROM concepts c WHERE c.subcategory_id = sc.id)
       AND NOT EXISTS (SELECT 1 FROM pipeline_state p WHERE p.key = 'validated:' || sc.id)
     ORDER BY sc.id LIMIT ?`,
    [limit]
  );
  let changes = 0;
  for (const sub of subs) {
    const concepts = await all<{ id: number; statement: string }>(
      'SELECT id, statement FROM concepts WHERE subcategory_id = ? ORDER BY id',
      [sub.id]
    );
    if (concepts.length >= 2) {
      const { system, user } = conceptValidationPrompt(sub.name, concepts);
      try {
        const res = await callJson<{ merge?: number[][]; delete?: number[] }>({
          system,
          user,
          maxTokens: 2048,
        });
        const drops = new Set<number>();
        for (const pair of res.merge || []) if (Array.isArray(pair) && pair.length === 2) drops.add(pair[1]);
        for (const id of res.delete || []) drops.add(id);
        for (const id of drops) {
          await run('DELETE FROM questions WHERE concept_id = ?', [id]);
          await run('DELETE FROM concepts WHERE id = ?', [id]);
          changes++;
        }
      } catch {
        /* leave concepts as-is on validation failure */
      }
    }
    // Build the key in JS: binding a JS number and concatenating in SQL stores
    // it as '5.0' (libSQL binds numbers as REAL), which never matches the
    // 'validated:' || sc.id (integer -> '5') check below → infinite loop.
    await run("INSERT OR REPLACE INTO pipeline_state (key, value) VALUES (?, '1')", [
      'validated:' + sub.id,
    ]);
  }
  return { processed: subs.length, changes };
}

export async function subcategoriesPendingValidation(): Promise<number> {
  const r = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM subcategories sc
     WHERE EXISTS (SELECT 1 FROM concepts c WHERE c.subcategory_id = sc.id)
       AND NOT EXISTS (SELECT 1 FROM pipeline_state p WHERE p.key = 'validated:' || sc.id)`
  );
  return Number(r?.n ?? 0);
}

// ---- Blueprint weights -----------------------------------------------------

export async function computeBlueprint(): Promise<{ subcategories: number }> {
  const rows = await all<{ subcategory_id: number; freq: number }>(
    `SELECT sc.id AS subcategory_id, COALESCE(SUM(c.pyq_frequency), 0) AS freq
     FROM subcategories sc LEFT JOIN concepts c ON c.subcategory_id = sc.id
     GROUP BY sc.id`
  );
  const totalFreq = rows.reduce((a, r) => a + Number(r.freq), 0) || 1;
  const writes = rows.map((r) => {
    // Small floor so no subcategory is ever entirely absent from a mock.
    const w = Number(r.freq) / totalFreq;
    const weight = Math.max(0.003, w);
    return {
      sql: 'INSERT OR REPLACE INTO blueprint_weights (subcategory_id, weight) VALUES (?, ?)',
      args: [r.subcategory_id, weight] as (number)[],
    };
  });
  await batchWrite(writes);
  return { subcategories: writes.length };
}
