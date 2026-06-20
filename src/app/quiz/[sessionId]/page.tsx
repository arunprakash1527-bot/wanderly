import { notFound, redirect } from 'next/navigation';
import { getSession, getSessionQuestions } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { MOCK_DURATION_SECONDS } from '@/lib/weights';
import QuizRunner, { type ClientQuestion } from '@/components/QuizRunner';

export const dynamic = 'force-dynamic';

export default async function QuizPage({ params }: { params: { sessionId: string } }) {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const sessionId = parseInt(params.sessionId, 10);
  if (Number.isNaN(sessionId)) notFound();

  const session = await getSession(user.id, sessionId);
  if (!session) notFound();
  if (session.completed_at) redirect(`/results/${sessionId}`);

  const rows = await getSessionQuestions(sessionId);
  const questions: ClientQuestion[] = rows.map((q) => ({
    attemptId: q.attempt_id,
    questionId: q.id,
    stem: q.stem,
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    category: q.category_name,
    subcategory: q.subcategory_name,
    sourceType: q.source_type,
    source: q.source_ref,
  }));

  let remainingSeconds: number | null = null;
  if (session.mode === 'mock') {
    const startedMs = new Date(session.started_at.replace(' ', 'T') + 'Z').getTime();
    const elapsed = Math.floor((Date.now() - startedMs) / 1000);
    remainingSeconds = Math.max(0, MOCK_DURATION_SECONDS - elapsed);
  }

  return (
    <QuizRunner
      sessionId={sessionId}
      mode={session.mode}
      questions={questions}
      remainingSeconds={remainingSeconds}
    />
  );
}
