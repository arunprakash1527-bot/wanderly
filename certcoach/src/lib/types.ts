export interface Exam {
  id: string
  user_id: string
  title: string
  provider: string
  description: string | null
  exam_date: string | null
  is_shared: boolean
  share_code: string | null
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  exam_id: string
  title: string
  order_index: number
  status: 'not_started' | 'reading' | 'quizzed' | 'mastered'
  coaching_summary: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  exam_id: string
  chapter_id: string | null
  file_name: string
  file_type: 'pdf' | 'image' | 'note' | 'text'
  storage_path: string
  extracted_text: string | null
  extraction_status: 'pending' | 'done' | 'failed'
  created_at: string
  updated_at: string
}

export interface SampleQuestion {
  id: string
  exam_id: string
  chapter_id: string | null
  source: string
  stem: string
  options: string[] | null
  correct_answer: string | null
  raw_image_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedMcq {
  id: string
  exam_id: string
  chapter_id: string | null
  stem: string
  options: string[]
  correct_index: number
  explanation: string
  topic_tag: string
  difficulty: number
  generated_from: string | null
  created_at: string
  updated_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  exam_id: string
  chapter_id: string | null
  mcq_id: string
  chosen_index: number
  is_correct: boolean
  answered_at: string
}

export interface UserProfile {
  id: string
  display_name: string | null
  subscription_tier: 'free' | 'paid'
  created_at: string
  updated_at: string
}

export interface UsageRecord {
  id: string
  user_id: string
  month: string
  mcq_generations: number
  coaching_calls: number
  extraction_calls: number
}
