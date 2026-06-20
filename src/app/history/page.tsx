import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listSessions } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import { MARK_PER_CORRECT } from '@/lib/weights';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const sessions = await listSessions(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">History</h1>
      {sessions.length === 0 ? (
        <p className="card p-6 text-sm text-ink-faint">
          No quizzes yet. <Link href="/" className="text-brand-600 underline">Start one</Link>.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Questions</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Accuracy</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-ink-faint/10">
                  <td className="px-4 py-2">{formatDate(s.started_at)}</td>
                  <td className="px-4 py-2 capitalize">{s.mode}</td>
                  <td className="px-4 py-2">{s.total_questions}</td>
                  <td className="px-4 py-2">
                    {s.completed_at
                      ? `${((s.correct_count || 0) * MARK_PER_CORRECT).toFixed(1)} marks`
                      : '—'}
                  </td>
                  <td className="px-4 py-2">{s.accuracy != null ? `${s.accuracy}%` : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={s.completed_at ? `/results/${s.id}` : `/quiz/${s.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {s.completed_at ? 'Review' : 'Resume'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
