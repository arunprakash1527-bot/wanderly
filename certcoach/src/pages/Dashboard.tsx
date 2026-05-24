import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Exam } from '../lib/types'
import { Plus, BookOpen, LogOut, Calendar, TrendingUp } from 'lucide-react'

interface ExamWithReadiness extends Exam {
  readiness?: number
  chapter_count?: number
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExamWithReadiness[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  async function loadExams() {
    const { data: examsData } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })

    if (examsData) {
      const examsWithInfo = await Promise.all(
        examsData.map(async (exam) => {
          const { count } = await supabase
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id)

          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('is_correct')
            .eq('exam_id', exam.id)

          const readiness = attempts && attempts.length > 0
            ? Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100)
            : 0

          return { ...exam, chapter_count: count || 0, readiness }
        })
      )
      setExams(examsWithInfo)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">CertCoach</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-slate-400 hover:text-slate-600"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Exams</h2>
            <p className="text-slate-500 mt-1">Your certification study dashboard</p>
          </div>
          <button
            onClick={() => navigate('/exams/new')}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Exam
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No exams yet</h3>
            <p className="text-slate-500 mb-6">
              Add your first certification exam to start studying.
            </p>
            <button
              onClick={() => navigate('/exams/new')}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Exam
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(exam => (
              <Link
                key={exam.id}
                to={`/exams/${exam.id}`}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {exam.title}
                    </h3>
                    {exam.provider && (
                      <span className="text-sm text-slate-500">{exam.provider}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{exam.readiness}%</div>
                    <div className="text-xs text-slate-400">readiness</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {exam.chapter_count} chapters
                  </span>
                  {exam.exam_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(exam.exam_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${exam.readiness}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
