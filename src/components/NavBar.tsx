'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Quiz' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/ingest', label: 'Ingest PYQs' },
  { href: '/sources', label: 'Sources' },
  { href: '/review', label: 'Review flagged' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="no-print border-b border-ink-faint/15 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2 font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500 text-sm text-white">
            G1
          </span>
          <span className="hidden sm:inline">TNPSC Group 1 Prep</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 transition ${
                  active
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-ink-soft hover:bg-sand'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
