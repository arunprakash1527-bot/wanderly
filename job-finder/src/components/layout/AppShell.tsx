import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="border-b">
      <div className="px-6 md:px-10 py-6 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-fg-muted mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
