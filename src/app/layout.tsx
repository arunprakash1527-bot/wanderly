import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import { currentUser } from '@/lib/user';
import { doSignOut } from './actions';

export const metadata: Metadata = {
  title: 'TNPSC Group 1 Prelims Prep',
  description:
    'Prepare for the TNPSC Group 1 Preliminary exam — type what you want to be tested on and get scored quizzes grounded in real PYQs.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {user && (
          <header className="no-print border-b border-ink-faint/15 bg-white">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
              <NavBar />
              <div className="ml-auto flex items-center gap-2 text-sm">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </span>
                )}
                <form action={doSignOut}>
                  <button className="text-ink-faint hover:text-ink" title="Sign out">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
