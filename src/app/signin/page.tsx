import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/user';
import { doSignIn } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect('/');

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-lg font-semibold text-white">
          G1
        </div>
        <h1 className="text-xl font-semibold text-ink">TNPSC Group 1 Prep</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sign in to build your own question bank, take quizzes, and track progress.
        </p>
        <form action={doSignIn} className="mt-6">
          <button className="btn-primary w-full justify-center" type="submit">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#fff"
                d="M21.35 11.1H12v3.83h5.35c-.23 1.5-1.66 4.4-5.35 4.4a6.13 6.13 0 0 1 0-12.26c1.94 0 3.24.82 3.98 1.53l2.71-2.6C17.46 3.9 15.06 3 12 3a9 9 0 1 0 0 18c5.2 0 8.64-3.66 8.64-8.8 0-.59-.06-1.04-.29-1.1Z"
              />
            </svg>
            Continue with Google
          </button>
        </form>
        <p className="mt-4 text-xs text-ink-faint">
          Your quizzes, bank, and analytics are private to your account.
        </p>
      </div>
    </div>
  );
}
