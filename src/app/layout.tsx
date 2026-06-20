import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import AccountMenu from '@/components/AccountMenu';
import { currentUser } from '@/lib/user';

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
            <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
              <NavBar />
              <AccountMenu name={user.name} email={user.email} image={user.image} />
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
