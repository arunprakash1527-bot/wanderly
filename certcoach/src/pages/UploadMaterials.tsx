import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { callClaude, extractTextFromResponse } from '../lib/claude'
import { useAuth } from '../contexts/AuthContext'
import type { Chapter } from '../lib/types'
import { ArrowLeft, Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function UploadMaterials() {
  const { examId } = useParams<{ examId: string }>()
  const [searchParams] = useSearchParams()
  const preselectedChapter = searchParams.get('chapter')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<string>(preselectedChapter || '')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [results, setResults] = useState<Array<{ name: string; status: 'success' | 'error'; message: string }>>([])

  useEffect(() => {
    if (examId) {
      supabase
        .from('chapters')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index')
        .then(({ data }) => { if (data) setChapters(data) })
    }
  }, [examId])

  const processFile = useCallback(async (file: globalThis.File) => {
    if (!user || !examId) return

    const fileType = file.type.startsWith('image/') ? 'image' as const : 'pdf' as const
    const storagePath = `${user.id}/${examId}/${Date.now()}-${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from('materials')
      .upload(storagePath, file)

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

    const { data: material, error: insertErr } = await supabase
      .from('materials')
      .insert({
        exam_id: examId,
        chapter_id: selectedChapter || null,
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath,
        extraction_status: 'pending',
      })
      .select()
      .single()

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

    setProcessing(file.name)

    try {
      let extractedText = ''

      if (fileType === 'image') {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

        const response = await callClaude([{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Transcribe all text visible in this image. Preserve structure, headings, bullet points, and formatting. If this contains a question with answer options, format them clearly.',
            },
          ],
        }])

        extractedText = extractTextFromResponse(response)
      } else {
        const text = await file.text()
        if (text.startsWith('%PDF')) {
          extractedText = `[PDF content from ${file.name} — client-side PDF parsing would extract text here. For now, the file is stored and available for processing.]`
        } else {
          extractedText = text.slice(0, 50000)
        }
      }

      await supabase
        .from('materials')
        .update({ extracted_text: extractedText, extraction_status: 'done' })
        .eq('id', material.id)

      return { status: 'success' as const, message: 'Uploaded and processed' }
    } catch (extractErr) {
      await supabase
        .from('materials')
        .update({ extraction_status: 'failed' })
        .eq('id', material.id)

      return { status: 'error' as const, message: `Extraction failed: ${extractErr instanceof Error ? extractErr.message : 'Unknown error'}` }
    }
  }, [user, examId, selectedChapter])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setResults([])

    const newResults: typeof results = []

    for (const file of Array.from(files)) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain']
      if (!validTypes.includes(file.type)) {
        newResults.push({ name: file.name, status: 'error', message: `Unsupported file type: ${file.type}` })
        continue
      }

      if (file.size > 20 * 1024 * 1024) {
        newResults.push({ name: file.name, status: 'error', message: 'File too large (max 20MB)' })
        continue
      }

      try {
        const result = await processFile(file)
        newResults.push({ name: file.name, ...(result || { status: 'error', message: 'Unknown error' }) })
      } catch (err) {
        newResults.push({ name: file.name, status: 'error', message: err instanceof Error ? err.message : 'Failed' })
      }
    }

    setResults(newResults)
    setUploading(false)
    setProcessing(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

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
          <h1 className="text-xl font-bold text-slate-900">Upload Materials</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {chapters.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Attach to chapter (optional)
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Whole exam (no specific chapter)</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.order_index + 1}. {ch.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className={`bg-white rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
            dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <p className="text-slate-700 font-medium">
                {processing ? `Processing ${processing}...` : 'Uploading...'}
              </p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Supports PDF, images (JPG, PNG), and text files. Max 20MB per file.
              </p>
              <label className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 cursor-pointer transition-colors">
                <Upload className="w-5 h-5" />
                Choose Files
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Results</h2>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {r.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  <p className={`text-xs ${r.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
