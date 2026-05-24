import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AddExam from './pages/AddExam'
import ExamDetail from './pages/ExamDetail'
import ChapterDetail from './pages/ChapterDetail'
import UploadMaterials from './pages/UploadMaterials'
import SampleQuestions from './pages/SampleQuestions'
import QuizRunner from './pages/QuizRunner'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/exams/new" element={<ProtectedRoute><AddExam /></ProtectedRoute>} />
      <Route path="/exams/:examId" element={<ProtectedRoute><ExamDetail /></ProtectedRoute>} />
      <Route path="/exams/:examId/chapters/:chapterId" element={<ProtectedRoute><ChapterDetail /></ProtectedRoute>} />
      <Route path="/exams/:examId/upload" element={<ProtectedRoute><UploadMaterials /></ProtectedRoute>} />
      <Route path="/exams/:examId/samples" element={<ProtectedRoute><SampleQuestions /></ProtectedRoute>} />
      <Route path="/exams/:examId/quiz" element={<ProtectedRoute><QuizRunner /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
