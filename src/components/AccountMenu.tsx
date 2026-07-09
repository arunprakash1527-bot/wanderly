'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doSignOut } from '@/app/actions';

// Avatar button that opens a small menu with the account and Sign out. Keeping
// Sign out behind the avatar (instead of as inline text) stops the header from
// wrapping onto a second line on narrow phones.
export default function AccountMenu({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = (name || email)[0]?.toUpperCase() || '?';

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="block rounded-full ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-ink-faint/15 bg-white p-1 shadow-lg">
          <div className="border-b border-ink-faint/10 px-3 py-2">
            {name && <p className="truncate text-sm font-medium text-ink">{name}</p>}
            <p className="truncate text-xs text-ink-faint">{email}</p>
          </div>
          <form action={doSignOut}>
            <button className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink-soft hover:bg-sand">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
