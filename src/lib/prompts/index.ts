// All Claude prompts live here so they are easy to tune (Section 11).
// Each exported function returns { system, user } strings.

import type { Difficulty } from '../types';

interface CatInfo {
  name: string;
  slug: string;
  subcategories: { name: string; slug: string }[];
}

// 1) Intake parser — chat text -> structured quiz config (JSON only).
export function intakeParserPrompt(message: string, categories: CatInfo[]) {
  const catList = categories
    .map(
      (c) =>
        `- ${c.name} (slug: ${c.slug})` +
        (c.subcategories.length
          ? `\n    subcategories: ${c.subcategories.map((s) => s.slug).join(', ')}`
          : '')
    )
    .join('\n');

  const system = `You convert a TNPSC Group 1 Prelims aspirant's natural-language request into a strict JSON quiz configuration.

Available categories and their slugs:
${catList}

Rules:
- Output ONLY a JSON object, no markdown fences, no commentary.
- Shape: {"mode":"practice"|"mock","categories":string[],"subcategories":string[],"difficulty":"easy"|"medium"|"hard"|"mixed","count":number,"note":string}
- "categories" and "subcategories" must be slugs drawn from the list above. Match the user's intent to the closest slugs. Leave arrays empty to mean "any".
- If the user asks for a "full mock" / "mock exam" / "200 questions", set mode="mock" and IGNORE other params; the app fills the 175 GS + 25 Aptitude split itself. Use count=200.
- Otherwise mode="practice". Default count=10 if unspecified; clamp count to 1..100.
- difficulty defaults to "mixed" if unspecified.
- "note": one short sentence echoing what you understood, or a clarifying question if the request is too vague to act on (in which case still return your best-guess config).`;

  return { system, user: message };
}

// 2) PYQ extractor — paper PDF -> structured questions (JSON only, verbatim).
export function pyqExtractorPrompt(categories: CatInfo[], hasAnswerKey: boolean, year?: number) {
  const catList = categories.map((c) => `${c.slug}`).join(', ');
  const system = `You are an exact, verbatim extractor of TNPSC Group 1 Prelims questions from a PDF.

CRITICAL: Extract questions EXACTLY as written. Do NOT paraphrase, translate, correct, or invent anything. If a field is unknown, return null for it. Never fabricate a "real" past question.

Return ONLY a JSON array (no markdown fences, no commentary). One object per question:
{
  "stem": string,
  "option_a": string, "option_b": string, "option_c": string, "option_d": string,
  "correct_option": "A"|"B"|"C"|"D"|null,
  "suggested_category": string|null,
  "suggested_subcategory": string|null,
  "suggested_difficulty": "easy"|"medium"|"hard"|null,
  "year": number|null,
  "source_ref": string|null
}

Guidance:
- ${hasAnswerKey ? 'An answer key is included in the document(s); use it to set correct_option.' : 'No answer key provided; set correct_option to null unless the paper itself marks the answer.'}
- suggested_category must be one of these slugs (best guess), or null: ${catList}.
- year: ${year ? `use ${year} if not otherwise stated.` : 'use the exam year printed on the paper, else null.'}
- source_ref like "TNPSC <year> Prelims Q<number>" when the number is known.
- The paper may be bilingual; extract the ENGLISH version only.`;

  return { system };
}

// 3) Question generator — grounded context -> new MCQs (JSON only).
export function questionGeneratorPrompt(args: {
  category: CatInfo;
  subcategorySlug: string | null;
  blurb: string;
  difficulty: Difficulty | 'mixed';
  count: number;
  exemplars: { stem: string; options: string[]; correct: string | null }[];
  chunks: string[];
  // When true, instruct the model to ground in real exam-style questions and
  // current facts found via the web_search tool (Section 9b web grounding).
  useWeb?: boolean;
}) {
  const { category, subcategorySlug, blurb, difficulty, count, exemplars, chunks, useWeb } = args;

  const exemplarText = exemplars.length
    ? exemplars
        .map(
          (e, i) =>
            `Exemplar ${i + 1}: ${e.stem}\n  A) ${e.options[0]}\n  B) ${e.options[1]}\n  C) ${e.options[2]}\n  D) ${e.options[3]}` +
            (e.correct ? `\n  (answer: ${e.correct})` : '')
        )
        .join('\n\n')
    : '(no real PYQ exemplars available for this topic)';

  const chunkText = chunks.length
    ? chunks.map((c, i) => `Source ${i + 1}:\n${c}`).join('\n\n')
    : '(no source material ingested for this topic — rely on the syllabus and exemplars)';

  const system = `You write fresh, exam-accurate multiple-choice questions for the TNPSC Group 1 Prelims (degree standard for General Studies, SSLC standard for Aptitude).

Topic: ${category.name}${subcategorySlug ? ` > ${subcategorySlug}` : ''}
Syllabus context: ${blurb}
Target difficulty: ${difficulty}. Match the cognitive level and phrasing style of the exemplar PYQs below — do not make questions trivially easy or artificially hard.

Ground your questions in the syllabus and the provided source material. Treat the exemplar PYQs and source material as STYLE and DIFFICULTY references only — study their phrasing, depth and pattern, then write brand-new questions on the same syllabus. Never reproduce an exemplar or a source question verbatim or with only cosmetic edits; always create genuinely new ones. Do not present invented facts as established. Each question must be factually correct, self-contained, and have exactly one unambiguous correct option.${
    useWeb
      ? `\n\nUse the web_search tool first to (1) study the format, phrasing and difficulty of REAL TNPSC Group 1 questions on this topic, and (2) verify the underlying facts you build questions on. Then write FRESH, original questions modelled on that real exam style — do NOT copy any real question verbatim. Search a few times as needed, then output only the JSON.`
      : ''
  }

Return ONLY a JSON array of exactly ${count} objects (no markdown fences, no commentary):
{
  "stem": string,
  "option_a": string, "option_b": string, "option_c": string, "option_d": string,
  "correct_option": "A"|"B"|"C"|"D",
  "explanation": string,
  "source": string,
  "difficulty": "easy"|"medium"|"hard",
  "confidence": "low"|"medium"|"high"
}
Set "confidence" honestly — "low" if you are unsure of the fact.
For "source", give ONE concise, verifiable reference for the key fact tested — the specific authority or standard study source, e.g. "Article 17, Constitution of India", "Cradle Baby Scheme — Govt. of Tamil Nadu", "NCERT — Modern India", "Sangam literature — Tolkappiyam". Cite the precise document/Act/scheme/book where possible. If you are not certain of an exact citation, give the syllabus area (e.g. "Indian Polity — Fundamental Rights") rather than inventing a specific source. Never fabricate a page number, section, or URL.`;

  const user = `Real PYQ exemplars (style/difficulty reference):\n\n${exemplarText}\n\n---\n\nSource material:\n\n${chunkText}\n\n---\n\nWrite ${count} new ${difficulty} questions on "${category.name}${subcategorySlug ? ` > ${subcategorySlug}` : ''}".`;

  return { system, user };
}

// 4) Explanation generator — question + correct answer -> explanation.
export function explanationPrompt(q: {
  stem: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correct: string;
  categoryName: string;
}) {
  const system = `You write concise, accurate explanations for TNPSC Group 1 Prelims questions. 2-4 sentences. Explain why the correct option is right and, where useful, why the obvious distractor is wrong. Stay factual; do not hedge. Output plain text only (no JSON, no markdown headers).`;
  const user = `Category: ${q.categoryName}
Question: ${q.stem}
A) ${q.options.A}
B) ${q.options.B}
C) ${q.options.C}
D) ${q.options.D}
Correct answer: ${q.correct}

Write the explanation.`;
  return { system, user };
}

// 5) Recommendation writer — computed stats -> study plan narrative.
export function recommendationPrompt(stats: {
  weak: { name: string; accuracy: number; attempts: number }[];
  strong: { name: string; accuracy: number; attempts: number }[];
  underPracticed: { name: string; attempts: number }[];
  overall: { sessions: number; accuracy: number; totalAttempts: number };
}) {
  const system = `You are a TNPSC Group 1 Prelims study coach. Using ONLY the numbers provided, write a short, specific study plan (120-200 words). Reference the actual accuracy percentages and attempt counts. Do NOT invent any statistic, topic, or number not present in the data. Prioritise weak areas, note strengths to maintain, and flag under-practiced areas. Plain text, no markdown headers.`;
  const user = `Overall: ${stats.overall.sessions} sessions, ${stats.overall.totalAttempts} attempts, ${stats.overall.accuracy}% accuracy.

Weakest areas:
${stats.weak.map((w) => `- ${w.name}: ${w.accuracy}% over ${w.attempts} attempts`).join('\n') || '- (not enough data)'}

Strongest areas:
${stats.strong.map((s) => `- ${s.name}: ${s.accuracy}% over ${s.attempts} attempts`).join('\n') || '- (not enough data)'}

Under-practiced areas:
${stats.underPracticed.map((u) => `- ${u.name}: only ${u.attempts} attempts`).join('\n') || '- (none)'}

Write the study plan.`;
  return { system, user };
}
