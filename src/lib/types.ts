// Shared domain types for the TNPSC Group 1 Prelims prep app.
// Kept framework-agnostic so they can be imported on both server and client.

export type Section = 'GS' | 'APTITUDE';
export type SourceType = 'pyq' | 'generated';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultyFilter = Difficulty | 'mixed';
export type Option = 'A' | 'B' | 'C' | 'D';
export type VerificationStatus = 'unverified' | 'verified' | 'flagged';
export type QuizMode = 'practice' | 'mock';

export interface Category {
  id: number;
  name: string;
  slug: string;
  section: Section;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
}

export interface Microtopic {
  id: number;
  subcategory_id: number;
  name: string;
  slug: string;
}

// ---- Concept-based content engine (spec revision) --------------------------
export type ConceptType =
  | 'fact'
  | 'date'
  | 'person'
  | 'place'
  | 'definition'
  | 'process'
  | 'relationship'
  | 'data'
  | 'provision';
export type ConceptSource = 'syllabus_decomposition' | 'pyq_mapping';

export interface Concept {
  id: number;
  subcategory_id: number;
  microtopic_id: number | null;
  statement: string;
  concept_type: ConceptType;
  difficulty: Difficulty;
  pyq_frequency: number;
  source: ConceptSource;
  created_at: string;
}

export interface Question {
  id: number;
  source_type: SourceType;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option | null;
  explanation: string | null;
  category_id: number;
  subcategory_id: number | null;
  microtopic_id: number | null;
  // Concept engine: every generated question tests exactly one concept.
  concept_id: number | null;
  variant_number: number;
  difficulty: Difficulty;
  year: number | null;
  source_ref: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface QuizConfig {
  mode: QuizMode;
  categories: string[]; // category slugs
  subcategories: string[]; // subcategory slugs
  microtopics?: string[]; // optional micro-topic slugs (one level below subcategory)
  difficulty: DifficultyFilter;
  count: number;
  // Optional human-readable note from the parser, surfaced back in the UI.
  note?: string;
}

export interface QuizSession {
  id: number;
  mode: QuizMode;
  config_json: string;
  total_questions: number;
  correct_count: number | null;
  score_marks: number | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface Attempt {
  id: number;
  session_id: number;
  question_id: number;
  concept_id: number | null; // denormalized for fast coverage/mastery queries
  chosen_option: Option | null;
  is_correct: number | null; // 0/1
  time_spent_seconds: number | null;
  user_flagged: number; // 0/1
}

export interface SourceDocument {
  id: number;
  title: string;
  category_id: number | null;
  file_path: string;
  ingested_at: string;
}

export interface SourceChunk {
  id: number;
  document_id: number;
  category_id: number | null;
  chunk_text: string;
}

// Shape returned by the AI PYQ extractor (Track 1) before owner review.
export interface ExtractedQuestion {
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option | null;
  suggested_category: string | null;
  suggested_subcategory: string | null;
  suggested_difficulty: Difficulty | null;
  year: number | null;
  source_ref: string | null;
}

// Shape returned by the AI question generator (Track 2).
export interface GeneratedQuestion {
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option;
  explanation: string;
  difficulty: Difficulty;
  confidence: 'low' | 'medium' | 'high';
}
