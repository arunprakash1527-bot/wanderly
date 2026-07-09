import type { ExtractedQuestion, Option } from './types';

// Importer for a pre-extracted TNPSC question bank (JSON). This is the reliable
// way to bring in a voluminous paper: the questions are stored as PYQ exemplars
// that *ground generation* (they are never served verbatim), so the model learns
// the real TNPSC style — statement-evaluation, match-the-following, the phrasing
// and difficulty — and writes fresh questions in that pattern.

// Shape of one item in the uploaded JSON (only the fields we use).
export interface BankItem {
  year?: number | null;
  paper_code?: string | null;
  question_number?: number | null;
  type?: string | null;
  subject?: string | null;
  topic?: string | null;
  stem?: string | null;
  statements?: string[] | null;
  match_pairs?: { left?: string[]; right?: string[] } | null;
  options?: string[] | null;
  correct_answer?: string | null;
  explanation?: string | null;
}

// Free-text topic -> taxonomy slug. Ordered: the first rule that matches wins,
// so put the more specific (Tamil Nadu, governance) rules before generic ones.
const TOPIC_RULES: [RegExp, string][] = [
  [/aptitude|reasoning|mental ability|quantitative|arithmetic/i, 'aptitude'],
  [/polity|constitution|fundamental right|directive principle|amendment|judiciar|parliament/i, 'indian-polity'],
  [/econom|black money|\bgdp\b|banking|fiscal|\btax\b|inflation|budget|monetary/i, 'indian-economy'],
  [/geograph|demograph|census|climate|monsoon|\briver|soil|mineral|agricultur/i, 'geography'],
  [/national movement|freedom struggle|independence|nationalism|gandhi|swaraj|quit india/i, 'indian-national-movement'],
  // Tamil Nadu governance / administration / welfare schemes
  [/(tamil ?nadu|\btn\b).*(administ|scheme|welfare|governance|board|e-?govern)|cradle baby|welfare scheme/i, 'tamil-nadu-governance'],
  // Tamil Nadu history & culture (incl. Dravidian movement, Tamil literature)
  [/tamil ?nadu|tamil|dravid|periyar|sangam|chola|pandya|pallava|\bchera\b|thanthai|justice party/i, 'history-tamil-nadu'],
  [/current|in news|award|honour|honor|\bsport/i, 'current-events'],
  [/science|physics|chemistry|biolog|technolog|nutrition|\bhealth\b/i, 'general-science'],
  // Generic history / culture / literature -> India
  [/histor|archaeolog|buddh|jain|mughal|cultur|literat|linguist|ancient|medieval|\bmodern\b/i, 'history-india'],
];

export function mapTopicToSlug(topic: string | null | undefined): string | null {
  if (!topic) return null;
  for (const [re, slug] of TOPIC_RULES) if (re.test(topic)) return slug;
  return null;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Fold statements / match-pairs into the stem so the exemplar reads as one
// complete question (the DB stores a single stem string).
function renderStem(item: BankItem): string {
  let stem = (item.stem || '').trim();
  const statements = item.statements || [];
  const left = item.match_pairs?.left || [];
  const right = item.match_pairs?.right || [];

  if (statements.length) {
    const lines = statements.map((s, i) => `${ROMAN[i] || i + 1}. ${s.trim()}`).join('\n');
    stem += `\n${lines}`;
  }
  if (left.length && right.length) {
    const l = left.map((s, i) => `${i + 1}. ${s.trim()}`).join('   ');
    const r = right.map((s, i) => `${LETTERS[i] || i}. ${s.trim()}`).join('   ');
    stem += `\nList I:  ${l}\nList II: ${r}`;
  }
  return stem.trim();
}

// Drop the ubiquitous "Answer not known" filler and keep the first four real
// options as A–D. The correct_answer letter still aligns because the filler is
// always the last option.
function cleanOptions(options: string[] | null | undefined): string[] {
  return (options || [])
    .map((o) => (o || '').trim())
    .filter((o) => o && !/^answer not known$/i.test(o))
    .slice(0, 4);
}

export interface ConvertResult {
  questions: ExtractedQuestion[];
  total: number;
  skipped: number;
  unmappedTopics: string[]; // topics that fell back to the default category
  byCategory: Record<string, number>;
}

// Convert the raw JSON array into ExtractedQuestion[] ready for /api/ingest/save.
// `defaultSlug` catches items whose topic doesn't map (null = skip those).
export function convertBank(items: BankItem[], defaultSlug: string | null): ConvertResult {
  const questions: ExtractedQuestion[] = [];
  const unmapped = new Set<string>();
  const byCategory: Record<string, number> = {};
  let skipped = 0;

  for (const item of items) {
    const opts = cleanOptions(item.options);
    const stem = renderStem(item);
    if (!stem || opts.length < 4) {
      skipped++;
      continue;
    }

    let slug = mapTopicToSlug(item.topic);
    if (!slug) {
      if (item.topic) unmapped.add(item.topic);
      slug = defaultSlug;
    }
    if (!slug) {
      skipped++;
      continue;
    }

    const ans = (item.correct_answer || '').trim().toUpperCase();
    const correct = ['A', 'B', 'C', 'D'].includes(ans) ? (ans as Option) : null;
    const ref =
      item.year && item.question_number
        ? `TNPSC ${item.year} Prelims Q${item.question_number}`
        : item.paper_code || null;

    questions.push({
      stem,
      option_a: opts[0],
      option_b: opts[1],
      option_c: opts[2],
      option_d: opts[3],
      correct_option: correct,
      suggested_category: slug,
      suggested_subcategory: null,
      suggested_difficulty: null,
      year: typeof item.year === 'number' ? item.year : null,
      source_ref: ref,
    });
    byCategory[slug] = (byCategory[slug] || 0) + 1;
  }

  return {
    questions,
    total: items.length,
    skipped,
    unmappedTopics: [...unmapped],
    byCategory,
  };
}
