import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { callClaude, extractTextFromResponse, parseJsonFromResponse } from '../lib/claude'
import type { Chapter, Material, GeneratedMcq } from '../lib/types'
import {
  ArrowLeft, Upload, Play, Sparkles, FileText, Image,
  Loader2, CheckCircle2, XCircle, BookOpen,
} from 'lucide-react'

export default function ChapterDetail() {
  const { examId, chapterId } = useParams<{ examId: string; chapterId: string }>()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [mcqs, setMcqs] = useState<GeneratedMcq[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [coaching, setCoaching] = useState(false)
  const [coachingSummary, setCoachingSummary] = useState<string | null>(null)
  const [genCount, setGenCount] = useState(10)
  const [error, setError] = useState('')

  useEffect(() => {
    if (chapterId) loadAll()
  }, [chapterId])

  async function loadAll() {
    setLoading(true)
    const [chRes, matRes, mcqRes] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', chapterId).single(),
      supabase.from('materials').select('*').eq('chapter_id', chapterId).order('created_at'),
      supabase.from('generated_mcqs').select('*').eq('chapter_id', chapterId).order('created_at'),
    ])
    if (chRes.data) {
      setChapter(chRes.data)
      setCoachingSummary(chRes.data.coaching_summary)
    }
    if (matRes.data) setMaterials(matRes.data)
    if (mcqRes.data) setMcqs(mcqRes.data)
    setLoading(false)
  }

  async function generateMcqs() {
    if (!chapter || !examId) return
    setGenerating(true)
    setError('')

    try {
      const extractedTexts = materials
        .filter(m => m.extracted_text && m.extraction_status === 'done')
        .map(m => m.extracted_text!)
        .join('\n\n---\n\n')

      if (!extractedTexts.trim()) {
        setError('No extracted text available. Upload and process materials first.')
        setGenerating(false)
        return
      }

      const { data: samples } = await supabase
        .from('sample_questions')
        .select('*')
        .eq('exam_id', examId)

      const sampleExamples = samples && samples.length > 0
        ? `\n\nHere are REAL sample questions from this exam. Mirror their style, phrasing patterns, scenario-vs-recall balance, and distractor patterns:\n\n${
          samples.map((s, i) => `Sample ${i + 1}:\nQ: ${s.stem}\n${
            s.options ? (s.options as string[]).map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`).join('\n') : ''
          }${s.correct_answer ? `\nAnswer: ${s.correct_answer}` : ''}${s.notes ? `\nStyle notes: ${s.notes}` : ''}`
          ).join('\n\n')
        }`
        : ''

      const response = await callClaude(
        [{
          role: 'user',
          content: `Generate ${genCount} multiple-choice questions based on this study material for chapter "${chapter.title}".

STUDY MATERIAL:
${extractedTexts.slice(0, 15000)}
${sampleExamples}

Return ONLY a JSON array. Each item must have exactly these fields:
- "stem": the question text
- "options": array of exactly 4 answer choices (strings)
- "correct_index": zero-based index of the correct answer (0-3)
- "explanation": brief explanation covering why the correct answer is right AND why the others are wrong
- "topic_tag": short topic label
- "difficulty": 1 (easy), 2 (medium), or 3 (hard)

Mix of difficulties: roughly 30% easy, 50% medium, 20% hard.
Ground all questions in the provided material. Do not invent facts.`,
        }],
        {
          system: 'You are an expert exam question writer. Generate high-quality MCQs that test real understanding, not just recall. Return strict JSON only — no markdown fences, no extra text.',
          maxTokens: 8192,
        }
      )

      const generated = parseJsonFromResponse<Array<{
        stem: string
        options: string[]
        correct_index: number
        explanation: string
        topic_tag: string
        difficulty: number
      }>>(response)

      const rows = generated.map(q => ({
        exam_id: examId,
        chapter_id: chapterId,
        stem: q.stem,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        topic_tag: q.topic_tag || '',
        difficulty: Math.min(3, Math.max(1, q.difficulty || 2)),
        generated_from: `Generated from ${materials.length} materials, ${samples?.length || 0} samples`,
      }))

      const { error: insertErr } = await supabase.from('generated_mcqs').insert(rows)
      if (insertErr) throw insertErr

      await supabase
        .from('chapters')
        .update({ status: 'quizzed' })
        .eq('id', chapterId)

      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate MCQs')
    } finally {
      setGenerating(false)
    }
  }

  async function coachMe() {
    if (!chapter) return
    setCoaching(true)
    setError('')

    try {
      const extractedTexts = materials
        .filter(m => m.extracted_text && m.extraction_status === 'done')
        .map(m => m.extracted_text!)
        .join('\n\n---\n\n')

      if (!extractedTexts.trim()) {
        setError('No extracted text available. Upload materials first.')
        setCoaching(false)
        return
      }

      const response = await callClaude(
        [{
          role: 'user',
          content: `Create a coaching summary for this chapter: "${chapter.title}"

STUDY MATERIAL:
${extractedTexts.slice(0, 15000)}

Provide:
1. **Key Concepts** — the core ideas a student must understand
2. **Commonly Tested Topics** — what's likely to appear on the exam
3. **Traps & Common Mistakes** — things students often get wrong
4. **Quick Review Points** — bullet points for last-minute revision

Ground everything in the provided material. Be concise but thorough.`,
        }],
        { system: 'You are an expert certification coach. Help students master exam content.', maxTokens: 4096 }
      )

      const summary = extractTextFromResponse(response)
      setCoachingSummary(summary)

      await supabase
        .from('chapters')
        .update({ coaching_summary: summary, status: chapter.status === 'not_started' ? 'reading' : chapter.status })
        .eq('id', chapterId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate coaching summary')
    } finally {
      setCoaching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (!chapter) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/exams/${examId}`)}
            className="text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{chapter.title}</h1>
            <span className="text-xs text-slate-500 capitalize px-2 py-0.5 bg-slate-100 rounded-full">
              {chapter.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Materials */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
            <button
              onClick={() => navigate(`/exams/${examId}/upload?chapter=${chapterId}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          {materials.length === 0 ? (
            <p className="text-sm text-slate-500">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map(mat => (
                <div key={mat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {mat.file_type === 'image' ? (
                    <Image className="w-5 h-5 text-purple-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{mat.file_name}</p>
                    <p className="text-xs text-slate-500">{mat.file_type}</p>
                  </div>
                  {mat.extraction_status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : mat.extraction_status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coach Me */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Coaching Summary</h2>
            </div>
            <button
              onClick={coachMe}
              disabled={coaching || materials.filter(m => m.extraction_status === 'done').length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {coaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {coaching ? 'Generating...' : coachingSummary ? 'Regenerate' : 'Coach Me'}
            </button>
          </div>

          {coachingSummary ? (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {coachingSummary}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Upload materials and click "Coach Me" to get an AI-generated study guide.
            </p>
          )}
        </div>

        {/* Generate MCQs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Generated MCQs ({mcqs.length})
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
              </select>
              <button
                onClick={generateMcqs}
                disabled={generating || materials.filter(m => m.extraction_status === 'done').length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate MCQs'}
              </button>
            </div>
          </div>

          {mcqs.length > 0 ? (
            <div className="space-y-2">
              {mcqs.slice(0, 5).map((q, i) => (
                <div key={q.id} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium text-slate-500">{i + 1}.</span> {q.stem}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      q.difficulty === 1 ? 'bg-green-100 text-green-700' :
                      q.difficulty === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard'}
                    </span>
                    <span className="text-xs text-slate-400">{q.topic_tag}</span>
                  </div>
                </div>
              ))}
              {mcqs.length > 5 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  + {mcqs.length - 5} more questions
                </p>
              )}

              <button
                onClick={() => navigate(`/exams/${examId}/quiz?chapter=${chapterId}`)}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Quiz ({mcqs.length} questions)
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No MCQs generated yet. Upload materials and click "Generate MCQs".
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
