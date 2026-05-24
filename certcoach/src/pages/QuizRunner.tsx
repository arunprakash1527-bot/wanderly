import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { GeneratedMcq } from '../lib/types'
import {
  ArrowLeft, CheckCircle2, XCircle, ChevronRight,
  BarChart3, RotateCcw, Trophy,
} from 'lucide-react'

export default function QuizRunner() {
  const { examId } = useParams<{ examId: string }>()
  const [searchParams] = useSearchParams()
  const chapterId = searchParams.get('chapter')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<GeneratedMcq[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Array<{ mcqId: string; correct: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [examId, chapterId])

  async function loadQuestions() {
    setLoading(true)
    let query = supabase
      .from('generated_mcqs')
      .select('*')
      .eq('exam_id', examId!)

    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }

    const { data } = await query.order('created_at')

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      setQuestions(shuffled)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (selectedOption === null || !user || !examId) return

    const question = questions[currentIndex]
    const isCorrect = selectedOption === question.correct_index

    await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      exam_id: examId,
      chapter_id: question.chapter_id,
      mcq_id: question.id,
      chosen_index: selectedOption,
      is_correct: isCorrect,
    })

    setResults([...results, { mcqId: question.id, correct: isCorrect }])
    setSubmitted(true)
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(null)
      setSubmitted(false)
    }
  }

  function restart() {
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setCurrentIndex(0)
    setSelectedOption(null)
    setSubmitted(false)
    setResults([])
    setFinished(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading quiz...</div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No questions available for this quiz.</p>
          <button
            onClick={() => navigate(`/exams/${examId}`)}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Back to exam
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    const correctCount = results.filter(r => r.correct).length
    const percentage = Math.round((correctCount / results.length) * 100)

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(`/exams/${examId}`)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Quiz Complete</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${
              percentage >= 80 ? 'text-green-500' :
              percentage >= 60 ? 'text-amber-500' : 'text-red-500'
            }`} />

            <h2 className="text-3xl font-bold text-slate-900 mb-2">{percentage}%</h2>
            <p className="text-slate-500 mb-6">
              {correctCount} of {results.length} correct
            </p>

            <div className="bg-slate-100 rounded-full h-3 overflow-hidden max-w-xs mx-auto mb-8">
              <div
                className={`h-full rounded-full ${
                  percentage >= 80 ? 'bg-green-500' :
                  percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <p className="text-sm text-slate-600 mb-8">
              {percentage >= 80
                ? 'Excellent! You have strong command of this material.'
                : percentage >= 60
                ? 'Good progress. Review the topics you got wrong and try again.'
                : 'Keep studying. Focus on understanding the core concepts before retaking.'}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={restart}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Quiz
              </button>
              <button
                onClick={() => navigate(`/exams/${examId}`)}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
              >
                <BarChart3 className="w-4 h-4" />
                View Readiness
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const question = questions[currentIndex]
  const questionOptions = (question.options as string[]) || []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(`/exams/${examId}`)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              question.difficulty === 1 ? 'bg-green-100 text-green-700' :
              question.difficulty === 2 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {question.difficulty === 1 ? 'Easy' : question.difficulty === 2 ? 'Medium' : 'Hard'}
            </span>
          </div>
          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <p className="text-lg text-slate-900 font-medium leading-relaxed">
            {question.stem}
          </p>
          {question.topic_tag && (
            <span className="inline-block mt-3 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              {question.topic_tag}
            </span>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {questionOptions.map((option, i) => {
            let borderClass = 'border-slate-200 hover:border-indigo-300'
            let bgClass = 'bg-white'

            if (submitted) {
              if (i === question.correct_index) {
                borderClass = 'border-green-400'
                bgClass = 'bg-green-50'
              } else if (i === selectedOption && i !== question.correct_index) {
                borderClass = 'border-red-400'
                bgClass = 'bg-red-50'
              } else {
                borderClass = 'border-slate-200'
                bgClass = 'bg-white opacity-60'
              }
            } else if (selectedOption === i) {
              borderClass = 'border-indigo-500 ring-2 ring-indigo-200'
              bgClass = 'bg-indigo-50'
            }

            return (
              <button
                key={i}
                onClick={() => !submitted && setSelectedOption(i)}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${borderClass} ${bgClass}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    submitted && i === question.correct_index
                      ? 'bg-green-500 text-white'
                      : submitted && i === selectedOption
                      ? 'bg-red-500 text-white'
                      : selectedOption === i
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {submitted && i === question.correct_index ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : submitted && i === selectedOption && i !== question.correct_index ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="text-sm text-slate-900 pt-1">{option}</span>
                </div>
              </button>
            )
          })}
        </div>

        {submitted && question.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Explanation</h3>
            <p className="text-sm text-blue-700 whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        <div className="flex justify-end">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
