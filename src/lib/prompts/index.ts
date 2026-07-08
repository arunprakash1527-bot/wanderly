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
  // Optional micro-topic to focus on (one level below the subcategory).
  focus?: string | null;
  blurb: string;
  difficulty: Difficulty | 'mixed';
  count: number;
  exemplars: { stem: string; options: string[]; correct: string | null }[];
  chunks: string[];
  // When true, instruct the model to ground in real exam-style questions and
  // current facts found via the web_search tool (Section 9b web grounding).
  useWeb?: boolean;
}) {
  const { category, subcategorySlug, focus, blurb, difficulty, count, exemplars, chunks, useWeb } =
    args;

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

Topic: ${category.name}${subcategorySlug ? ` > ${subcategorySlug}` : ''}${focus ? ` > ${focus}` : ''}
Syllabus context: ${blurb}${focus ? `\nFocus EVERY question specifically on: ${focus}. Do not drift to the broader topic.` : ''}
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
  "difficulty": "easy"|"medium"|"hard",
  "confidence": "low"|"medium"|"high"
}
Set "confidence" honestly — "low" if you are unsure of the fact.`;

  const user = `Real PYQ exemplars (style/difficulty reference):\n\n${exemplarText}\n\n---\n\nSource material:\n\n${chunkText}\n\n---\n\nWrite ${count} new ${difficulty} questions on "${category.name}${subcategorySlug ? ` > ${subcategorySlug}` : ''}".`;

  return { system, user };
}

// ---- Concept-based content engine -----------------------------------------

// Shared option-construction rules used by concept question generation. These
// keep distractors fair and unambiguous (the "meta-option fix").
export const OPTION_RULES = `Option-construction rules (follow ALL):
- Exactly 4 options A-D; exactly one is correct.
- No "All of the above", "None of the above", "Both A and B" style meta-options.
- All four options must be the same kind of thing, similar length and grammatical form.
- Distractors must be plausible, from the same domain, and factually wrong for THIS question — not absurd or off-topic.
- No two options may be synonyms or overlap such that more than one could be argued correct.
- Do not signal the answer by making the correct option longer, more detailed, or more hedged.
- Vary which position (A/B/C/D) holds the correct answer.`;

// C1) Syllabus decomposition — subtopic -> inventory of atomic testable facts.
export function conceptDecompositionPrompt(microtopicName: string, parentContext: string) {
  const system = `You build a fact inventory for TNPSC Group 1 Prelims — a tough, DEGREE-STANDARD exam. For the given micro-topic, enumerate the distinct testable facts a well-prepared candidate must know.
Each fact must be: (1) atomic — exactly one testable claim; (2) stated declaratively as a complete sentence; (3) verifiable against standard sources (NCERT, Tamil Nadu State Board texts, official government publications); (4) EXAM-WORTHY at degree standard.
Prefer specific, precise, less-obvious facts — exact provisions/articles, numbers and thresholds, exceptions, comparisons, and lesser-known details that distinguish a well-prepared candidate. AVOID trivially basic general knowledge that any school student already knows (e.g. "The President appoints the Prime Minister", "India's capital is New Delhi").
Classify each as one of: fact, date, person, place, definition, process, relationship, data, provision. Set "difficulty" honestly, leaning "medium"/"hard" — this is Group 1.
Do NOT include compound statements (split them).
Return ONLY a JSON array of objects with keys "statement", "concept_type", "difficulty" ("easy"|"medium"|"hard"). Aim for 15-40 items depending on how much the micro-topic carries.`;
  const user = `Micro-topic: ${microtopicName}
Syllabus context: ${parentContext}

Enumerate the testable facts as JSON.`;
  return { system, user };
}

// C2) PYQ mapping — a real past question -> the atomic fact it tests.
export function pyqConceptMappingPrompt(subcategorySlugs: string[]) {
  const system = `You map a real TNPSC Group 1 past question to the single atomic fact it tests, stated declaratively, and to the best-fitting syllabus subcategory.
Return ONLY a JSON object: {"subcategory_slug": string, "statement": string, "concept_type": "fact"|"date"|"person"|"place"|"definition"|"process"|"relationship"|"data"|"provision", "difficulty": "easy"|"medium"|"hard"}.
"subcategory_slug" must be one of: ${subcategorySlugs.join(', ')}.
"statement" is the one fact the question hinges on, as a complete declarative sentence (not the question itself).`;
  return { system };
}

// C3) Validation pass — dedupe / split / delete within a subcategory.
export function conceptValidationPrompt(
  subcategoryName: string,
  concepts: { id: number; statement: string }[]
) {
  const list = concepts.map((c) => `[${c.id}] ${c.statement}`).join('\n');
  const system = `You review a list of "concepts" (atomic testable facts) for one TNPSC subcategory and flag problems.
Return ONLY a JSON object:
{
  "merge": [[id, id], ...],   // pairs that test the SAME fact in different words; keep the first id, drop the second
  "delete": [id, ...],        // ids that are NOT verifiable single facts / are trivia
  "split": [id, ...]          // ids that are compound (contain more than one testable fact)
}
Only include genuine problems. Empty arrays are fine.`;
  const user = `Subcategory: ${subcategoryName}\n\nConcepts:\n${list}`;
  return { system, user };
}

// C4) Per-concept question generation (one question testing exactly one fact),
// modelled on the format/phrasing of real TNPSC past questions (exemplars).
export function conceptQuestionPrompt(
  statement: string,
  difficulty: Difficulty,
  avoidStems: string[],
  exemplars: { stem: string; options: string[]; correct: string | null }[] = []
) {
  const exemplarText = exemplars.length
    ? exemplars
        .map(
          (e, i) =>
            `Real PYQ ${i + 1}: ${e.stem}\n  A) ${e.options[0]}\n  B) ${e.options[1]}\n  C) ${e.options[2]}\n  D) ${e.options[3]}`
        )
        .join('\n\n')
    : '(no real past questions available for this topic — use the standard TNPSC style)';

  const system = `You write exactly ONE multiple-choice question for the TNPSC Group 1 Prelims that tests this specific fact and nothing beyond it:
"${statement}"

Model the FORMAT, phrasing and difficulty on real TNPSC Group 1 past questions. TNPSC commonly uses these forms — pick whichever best fits the fact:
- a direct single-answer question;
- "Which of the following statement(s) is/are correct?" with numbered statements (I, II, III...) where options are combinations (e.g. "I and II only");
- "Match the following" (List I with List II);
- assertion-and-reason.
Write in that exam register — but the question must hinge ONLY on the assigned fact above; do not test a neighbouring fact, and do not copy any exemplar.

${OPTION_RULES}

DIFFICULTY — this is the PRELIMS at DEGREE STANDARD, and Group 1 is one of the toughest state exams. Pitch every question hard:
- Do NOT write trivial, direct, one-line recall a school student could answer (e.g. "Who appoints the Prime Minister?", "What is the capital of X?"). Such questions are unacceptable.
- Prefer statement-evaluation (multiple numbered statements to judge) or matching, so more than one fact/distinction must be known.
- Use precise, closely-competing distractors — near-correct options (adjacent articles, similar schemes, close dates/numbers, common misconceptions) that require exact knowledge to eliminate.
- Test the finer, less-obvious edge of the fact (exceptions, specific provisions/numbers, comparisons, application), not the headline.
- Even when the underlying fact is basic, raise the challenge through framing and distractors. Target difficulty: ${difficulty} — treat it as a FLOOR, never a ceiling.

Return ONLY JSON: {"stem": string, "option_a": string, "option_b": string, "option_c": string, "option_d": string, "correct_option": "A"|"B"|"C"|"D", "explanation": string}.
For statement/match questions, put the statements or lists inside "stem". The explanation states why the correct answer is right and briefly why each distractor is wrong.`;

  const user = `Real TNPSC past questions for this topic (copy their STYLE and format, not their content):

${exemplarText}

---
${
    avoidStems.length
      ? `Write a fresh wording that differs from these existing variants:\n${avoidStems
          .map((s) => `- ${s}`)
          .join('\n')}`
      : 'Write the question in the TNPSC style above.'
  }`;
  return { system, user };
}

// C5) Concept-fidelity self-check — does the question test the assigned fact only?
export function conceptFidelityPrompt(
  statement: string,
  q: { stem: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string }
) {
  const system = `You are a strict examiner checking ONE TNPSC multiple-choice question before it enters a question bank.
FIRST, independently solve the question yourself from scratch — determine which option is actually correct. For "which of the following statements is/are correct" questions, evaluate the truth of EACH numbered statement, then find the option whose combination matches exactly. THEN compare with the marked answer.
Return ONLY JSON: {"answer_correct": boolean, "single_correct": boolean, "tests_concept": boolean, "your_answer": "A"|"B"|"C"|"D", "reason": string}.
- "answer_correct": true ONLY if the marked option equals the option you independently determined to be correct.
- "single_correct": true ONLY if exactly one option is defensibly correct (no two options both correct, no zero correct).
- "tests_concept": true ONLY if answering requires knowing the assigned fact.
Be rigorous and do not rubber-stamp — if the marked answer is wrong, say so.`;
  const user = `Assigned fact: ${statement}

Question: ${q.stem}
A) ${q.option_a}
B) ${q.option_b}
C) ${q.option_c}
D) ${q.option_d}
Marked correct option: ${q.correct_option}

Evaluate.`;
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
