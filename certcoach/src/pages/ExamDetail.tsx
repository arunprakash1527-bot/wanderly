import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Exam, Chapter } from '../lib/types'
import {
  ArrowLeft, Plus, Upload, FileQuestion, Play, BarChart3,
  CheckCircle2, Circle, BookMarked, Award,
} from 'lucide-react'

interface ChapterWithReadiness extends Chapter {
  percent_correct: number
  total_attempts: number
  mcq_count: number
  material_count: number
}

export default function ExamDetail() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [chapters, setChapters] = useState<ChapterWithReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chapters' | 'materials' | 'samples' | 'readiness'>('chapters')
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingChapter, setAddingChapter] = useState(false)

  useEffect(() => {
    if (examId) loadExam()
  }, [examId])

  async function loadExam() {
    setLoading(true)
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examData) {
      setExam(examData)
      await loadChapters()
    }
    setLoading(false)
  }

  async function loadChapters() {
    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index')

    if (chaptersData) {
      const enriched = await Promise.all(
        chaptersData.map(async (ch) => {
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('is_correct')
            .eq('chapter_id', ch.id)

          const { count: mcqCount } = await supabase
            .from('generated_mcqs')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', ch.id)

          const { count: matCount } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', ch.id)

          const total = attempts?.length || 0
          const correct = attempts?.filter(a => a.is_correct).length || 0

          return {
            ...ch,
            total_attempts: total,
            percent_correct: total > 0 ? Math.round((correct / total) * 100) : 0,
            mcq_count: mcqCount || 0,
            material_count: matCount || 0,
          }
        })
      )
      setChapters(enriched)
    }
  }

  async function addChapter() {
    if (!newChapterTitle.trim() || !examId) return
    setAddingChapter(true)

    const { error } = await supabase.from('chapters').insert({
      exam_id: examId,
      title: newChapterTitle.trim(),
      order_index: chapters.length,
    })

    if (!error) {
      setNewChapterTitle('')
      await loadChapters()
    }
    setAddingChapter(false)
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'mastered': return <Award className="w-5 h-5 text-green-500" />
      case 'quizzed': return <CheckCircle2 className="w-5 h-5 text-blue-500" />
      case 'reading': return <BookMarked className="w-5 h-5 text-amber-500" />
      default: return <Circle className="w-5 h-5 text-slate-300" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Exam not found</p>
          <Link to="/" className="text-indigo-600 hover:text-indigo-700">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const overallReadiness = chapters.length > 0
    ? Math.round(chapters.reduce((sum, ch) => sum + ch.percent_correct, 0) / chapters.length)
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">{exam.title}</h1>
              {exam.provider && <span className="text-sm text-slate-500">{exam.provider}</span>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{overallReadiness}%</div>
              <div className="text-xs text-slate-400">overall readiness</div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-slate-200 -mb-px">
            {(['chapters', 'materials', 'samples', 'readiness'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'chapters' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Chapters</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/exams/${examId}/upload`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="w-4 h-4" />
                  Upload Materials
                </button>
                <button
                  onClick={() => navigate(`/exams/${examId}/samples`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileQuestion className="w-4 h-4" />
                  Sample Questions
                </button>
              </div>
            </div>

            {chapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/exams/${examId}/chapters/${ch.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  {statusIcon(ch.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-400">
                        {ch.order_index + 1}.
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {ch.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{ch.material_count} materials</span>
                      <span>{ch.mcq_count} MCQs</span>
                      {ch.total_attempts > 0 && <span>{ch.total_attempts} attempts</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ch.total_attempts > 0 ? (
                      <>
                        <div className="text-lg font-bold text-indigo-600">{ch.percent_correct}%</div>
                        <div className="text-xs text-slate-400">correct</div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Not started</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addChapter() }
                }}
                placeholder="Add a new chapter..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                onClick={addChapter}
                disabled={addingChapter || !newChapterTitle.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Study Materials</h3>
            <p className="text-slate-500 mb-6">PDFs, images, screenshots — attach them to chapters.</p>
            <button
              onClick={() => navigate(`/exams/${examId}/upload`)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
            >
              <Upload className="w-5 h-5" />
              Upload Materials
            </button>
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="text-center py-12">
            <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Capture Sample Questions</h3>
            <p className="text-slate-500 mb-6">Add real exam questions so AI can match their style.</p>
            <button
              onClick={() => navigate(`/exams/${examId}/samples`)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
            >
              <FileQuestion className="w-5 h-5" />
              Add Sample Questions
            </button>
          </div>
        )}

        {activeTab === 'readiness' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Readiness by Chapter</h3>
              </div>
              {chapters.length === 0 ? (
                <p className="text-slate-500 text-sm">Add chapters and take quizzes to see your readiness.</p>
              ) : (
                <div className="space-y-3">
                  {chapters.map(ch => (
                    <div key={ch.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 truncate">{ch.title}</span>
                        <span className="text-slate-500 shrink-0 ml-2">
                          {ch.total_attempts > 0 ? `${ch.percent_correct}%` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ch.percent_correct >= 80 ? 'bg-green-500' :
                            ch.percent_correct >= 50 ? 'bg-amber-500' :
                            ch.total_attempts > 0 ? 'bg-red-500' : 'bg-slate-200'
                          }`}
                          style={{ width: `${ch.total_attempts > 0 ? ch.percent_correct : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {chapters.some(ch => ch.total_attempts > 0 && ch.percent_correct < 60) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Focus Recommendation</h4>
                <p className="text-sm text-amber-700">
                  Focus on: {chapters.filter(ch => ch.total_attempts > 0 && ch.percent_correct < 60)
                    .sort((a, b) => a.percent_correct - b.percent_correct)
                    .map(ch => ch.title)
                    .join(', ')}
                </p>
              </div>
            )}

            {chapters.some(ch => ch.mcq_count > 0) && (
              <button
                onClick={() => navigate(`/exams/${examId}/quiz`)}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Full Exam Quiz
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
