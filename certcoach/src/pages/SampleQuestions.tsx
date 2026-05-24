import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Chapter, SampleQuestion } from '../lib/types'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default function SampleQuestions() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [samples, setSamples] = useState<SampleQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const [stem, setStem] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [source, setSource] = useState('official mock')
  const [notes, setNotes] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (examId) loadData()
  }, [examId])

  async function loadData() {
    setLoading(true)
    const [chapRes, sampRes] = await Promise.all([
      supabase.from('chapters').select('*').eq('exam_id', examId).order('order_index'),
      supabase.from('sample_questions').select('*').eq('exam_id', examId).order('created_at', { ascending: false }),
    ])
    if (chapRes.data) setChapters(chapRes.data)
    if (sampRes.data) setSamples(sampRes.data)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!stem.trim() || !examId) return
    setSaving(true)
    setError('')

    try {
      const filteredOptions = options.filter(o => o.trim())

      const { error: insertErr } = await supabase.from('sample_questions').insert({
        exam_id: examId,
        chapter_id: chapterId || null,
        source,
        stem: stem.trim(),
        options: filteredOptions.length > 0 ? filteredOptions : null,
        correct_answer: correctAnswer.trim() || null,
        notes: notes.trim() || null,
      })

      if (insertErr) throw insertErr

      setStem('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setNotes('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSample(id: string) {
    await supabase.from('sample_questions').delete().eq('id', id)
    setSamples(samples.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

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
          <h1 className="text-xl font-bold text-slate-900">Sample Questions</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm text-indigo-800">
            <strong>Why sample questions matter:</strong> When you capture real exam questions here,
            the AI will mirror their style, phrasing, and difficulty when generating new MCQs.
            Even 3-5 samples significantly improve generation quality.
          </p>
        </div>

        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Add Sample Question</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Question Stem <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
              placeholder="Paste the question text here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Answer Options (optional)
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-500 w-6">
                  {String.fromCharCode(65 + i)})
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options]
                    newOpts[i] = e.target.value
                    setOptions(newOpts)
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="e.g. A or the answer text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="official mock">Official Mock Exam</option>
                <option value="textbook">Textbook</option>
                <option value="screenshot">Screenshot</option>
                <option value="practice paper">Practice Paper</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {chapters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chapter (optional)
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Whole exam</option>
                {chapters.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {ch.order_index + 1}. {ch.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Style Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
              placeholder="What's distinctive about this question's style? (e.g. 'scenario-based', 'calculation required', 'uses negative phrasing')"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !stem.trim()}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Add Sample Question'}
          </button>
        </form>

        {samples.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Captured Samples ({samples.length})
            </h2>
            {samples.map(s => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-lg relative group">
                <button
                  onClick={() => deleteSample(s.id)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-sm text-slate-900 font-medium pr-8">{s.stem}</p>
                {s.options && (
                  <div className="mt-2 space-y-1">
                    {(s.options as string[]).map((o, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        {String.fromCharCode(65 + i)}) {o}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="bg-slate-200 px-1.5 py-0.5 rounded">{s.source}</span>
                  {s.correct_answer && <span>Answer: {s.correct_answer}</span>}
                  {s.notes && <span className="italic">{s.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
