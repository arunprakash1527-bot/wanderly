'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY = [
  { href: '/', label: 'Quiz' },
  { href: '/coverage', label: 'Coverage' },
  { href: '/analytics', label: 'Analytics' },
];
const SECONDARY = [
  { href: '/history', label: 'History' },
  { href: '/ingest', label: 'Reference bank' },
  { href: '/sources', label: 'Sources' },
  { href: '/review', label: 'Review flagged' },
  { href: '/admin', label: 'Admin (owner)' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when the route changes (a link was chosen).
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  return (
    <>
      <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500 text-sm text-white">
          G1
        </span>
        <span className="hidden sm:inline">TNPSC Group 1</span>
      </Link>
      <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
        {PRIMARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-2.5 py-1.5 transition sm:px-3 ${
              isActive(l.href) ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-soft hover:bg-sand'
            }`}
          >
            {l.label}
          </Link>
        ))}
        {/* Secondary tools — kept lighter so the landing stays uncluttered. */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`rounded-md px-2.5 py-1.5 sm:px-3 ${
              moreOpen ? 'bg-sand text-ink' : 'text-ink-soft hover:bg-sand'
            }`}
          >
            More {moreOpen ? '▴' : '▾'}
          </button>
          {moreOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-ink-faint/15 bg-white p-1 shadow-lg">
              {SECONDARY.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMoreOpen(false)}
                  className={`block rounded-md px-3 py-1.5 text-sm ${
                    isActive(l.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-sand'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
