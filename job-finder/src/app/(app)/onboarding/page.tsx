import Link from "next/link";
import { ArrowRight, FileText, Target, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <div>
      <PageHeader title="Welcome to Pathway" subtitle="Three steps before you see your tailored board." />
      <div className="px-6 md:px-10 py-6 max-w-2xl space-y-3">
        <Step n={1} Icon={FileText} title="Paste your CV" body="The base copy. AI tailors a fresh version per role." href="/preferences" />
        <Step n={2} Icon={Target}  title="Set your search" body="Roles, locations, seniority, work model, salary floor." href="/preferences" />
        <Step n={3} Icon={Sparkles} title="Browse the board" body="Daily-refreshed roles. One click to tailor + apply." href="/jobs" />
      </div>
    </div>
  );
}

function Step({ n, Icon, title, body, href }: { n: number; Icon: React.FC<{ className?: string }>; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border bg-surface p-4 hover:shadow-card transition">
      <div className="size-10 rounded-xl bg-accent/10 grid place-items-center text-accent">
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-fg-muted">Step {n}</p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-fg-muted">{body}</p>
      </div>
      <Button variant="ghost" size="sm">Open<ArrowRight className="size-4" /></Button>
    </Link>
  );
}
