import Link from "next/link";
import { Sparkles, ArrowRight, Target, FileText, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-accent" />
          <span className="font-semibold tracking-tight">Pathway</span>
        </div>
        <Link href="/jobs"><Button variant="ghost" size="sm">Open app<ArrowRight className="size-4" /></Button></Link>
      </header>

      <section className="container pt-16 pb-24 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
          Stop scrolling job boards. Start landing roles.
        </h1>
        <p className="mt-5 text-lg text-fg-muted max-w-xl">
          Pathway pulls fresh roles from Greenhouse, Lever, Ashby, LinkedIn, and Adzuna into one
          interactive board, tailors your CV and cover letter for each role with AI, and tracks
          every application end-to-end.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/onboarding"><Button size="lg">Get started<ArrowRight className="size-4" /></Button></Link>
          <Link href="/jobs"><Button variant="secondary" size="lg">Browse jobs</Button></Link>
        </div>
      </section>

      <section className="container pb-24 grid md:grid-cols-3 gap-6 max-w-5xl">
        <Feature Icon={Target} title="Targeted board"
          body="Set roles, locations, seniority, work model. Up to 50 saved searches that refresh daily." />
        <Feature Icon={FileText} title="AI tailoring"
          body="One click rewrites your CV and drafts a cover letter for the specific posting — three formats each." />
        <Feature Icon={LineChart} title="Application tracker"
          body="Every apply is logged. See pipeline at a glance: saved, applied, interviewing, offer." />
      </section>

      <footer className="border-t">
        <div className="container py-6 text-xs text-fg-muted flex justify-between">
          <span>Pathway · v0.1</span>
          <span>Built with Next.js, Supabase, Claude</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ Icon, title, body }: { Icon: React.FC<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-6">
      <Icon className="size-5 text-accent" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{body}</p>
    </div>
  );
}
