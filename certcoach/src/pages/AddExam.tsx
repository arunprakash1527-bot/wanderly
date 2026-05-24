import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'

interface ChapterInput {
  title: string
  order_index: number
}

export default function AddExam() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [provider, setProvider] = useState('')
  const [description, setDescription] = useState('')
  const [examDate, setExamDate] = useState('')
  const [chapters, setChapters] = useState<ChapterInput[]>([])
  const [newChapter, setNewChapter] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addChapter() {
    if (!newChapter.trim()) return
    setChapters([...chapters, { title: newChapter.trim(), order_index: chapters.length }])
    setNewChapter('')
  }

  function removeChapter(index: number) {
    setChapters(chapters.filter((_, i) => i !== index).map((ch, i) => ({ ...ch, order_index: i })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setError('')
    setSaving(true)

    try {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          user_id: user.id,
          title: title.trim(),
          provider: provider.trim(),
          description: description.trim() || null,
          exam_date: examDate || null,
        })
        .select()
        .single()

      if (examError) throw examError

      if (chapters.length > 0) {
        const { error: chapError } = await supabase.from('chapters').insert(
          chapters.map((ch) => ({
            exam_id: exam.id,
            title: ch.title,
            order_index: ch.order_index,
          }))
        )
        if (chapError) throw chapError
      }

      navigate(`/exams/${exam.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Add Exam</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Exam Details</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. PRMIA ORM Designation – Part 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. PRMIA, PMI, AWS"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Brief description of this exam..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Date (optional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Chapters</h2>
            <p className="text-sm text-slate-500">
              Define the chapters/sections of this exam. You can add more later.
            </p>

            {chapters.length > 0 && (
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-500 w-6">{i + 1}.</span>
                    <span className="flex-1 text-sm text-slate-900">{ch.title}</span>
                    <button
                      type="button"
                      onClick={() => removeChapter(i)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChapter()
                  }
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Chapter title (press Enter to add)"
              />
              <button
                type="button"
                onClick={addChapter}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
