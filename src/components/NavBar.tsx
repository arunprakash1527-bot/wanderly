'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY = [
  { href: '/', label: 'Quiz' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
];
const SECONDARY = [
  { href: '/ingest', label: 'Ingest PYQs' },
  { href: '/sources', label: 'Sources' },
  { href: '/review', label: 'Review flagged' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500 text-sm text-white">
          G1
        </span>
        <span className="hidden sm:inline">TNPSC G1</span>
      </Link>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {PRIMARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 transition ${
              isActive(l.href) ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-soft hover:bg-sand'
            }`}
          >
            {l.label}
          </Link>
        ))}
        {/* Secondary tools — kept lighter so the landing stays uncluttered. */}
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-md px-3 py-1.5 text-ink-soft hover:bg-sand">
            More ▾
          </summary>
          <div className="absolute z-10 mt-1 w-44 rounded-lg border border-ink-faint/15 bg-white p-1 shadow-lg">
            {SECONDARY.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-md px-3 py-1.5 text-sm ${
                  isActive(l.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-sand'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </>
  );
}
