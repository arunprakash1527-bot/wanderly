"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Bookmark, Inbox, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/jobs", label: "Jobs", Icon: Briefcase },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/applications", label: "Applications", Icon: Inbox },
  { href: "/preferences", label: "Preferences", Icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r bg-surface/50">
      <div className="px-5 py-5 flex items-center gap-2">
        <Sparkles className="size-5 text-accent" />
        <span className="font-semibold tracking-tight">Pathway</span>
      </div>
      <nav className="px-2 py-2 space-y-0.5">
        {items.map(({ href, label, Icon }) => {
          const active = path === href || path?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                active ? "bg-muted text-fg font-medium" : "text-fg-muted hover:bg-muted hover:text-fg",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 text-[11px] text-fg-muted">
        <div>v0.1 · early access</div>
      </div>
    </aside>
  );
}
