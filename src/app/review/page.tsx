import { redirect } from 'next/navigation';
import { getFlaggedQuestions } from '@/lib/repo';
import { currentUser } from '@/lib/user';
import ReviewFlagged, { type FlaggedItem } from '@/components/ReviewFlagged';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const user = await currentUser();
  if (!user) redirect('/signin');
  const flagged = await getFlaggedQuestions(user.id);
  const items: FlaggedItem[] = flagged.map((q) => ({
    id: q.id,
    stem: q.stem,
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    correct: q.correct_option,
    category: q.category_name,
    sourceType: q.source_type,
    sourceRef: q.source_ref,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Review flagged questions</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Questions you flagged as wrong are excluded from quizzes until you act on them here. Fix
          the answer and restore, or delete.
        </p>
      </div>
      <ReviewFlagged initialItems={items} />
    </div>
  );
}
