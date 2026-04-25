"use client";
import { Briefcase, MapPin, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fmtSalary, relativeTime } from "@/lib/utils";

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  company_logo_url: string | null;
  location: string | null;
  work_model: string | null;
  seniority: string | null;
  posted_at: string | null;
  canonical_url: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  source: string;
}

const seniorityLabel: Record<string, string> = {
  entry: "Entry", mid: "Mid", senior: "Senior", staff: "Staff",
  principal: "Principal", director: "Director", vp: "VP", csuite: "C-Suite",
};

export function JobCard({ job, onSelect }: { job: JobCardData; onSelect?: () => void }) {
  const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_currency);
  return (
    <Card
      className="p-5 cursor-pointer hover:shadow-pop transition-shadow"
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-lg bg-muted shrink-0 grid place-items-center overflow-hidden">
          {job.company_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.company_logo_url} alt=""
              className="size-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : <Briefcase className="size-5 text-fg-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight truncate">{job.title}</h3>
              <p className="text-sm text-fg-muted truncate mt-0.5">{job.company}</p>
            </div>
            <a
              href={job.canonical_url} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-fg-muted hover:text-accent"
              title="Open posting"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            {job.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{job.location}</span>
            )}
            {job.posted_at && (
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />{relativeTime(job.posted_at)}</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.seniority && <Badge tone="accent">{seniorityLabel[job.seniority] ?? job.seniority}</Badge>}
            {job.work_model && <Badge tone="muted" className="capitalize">{job.work_model}</Badge>}
            {salary && <Badge tone="success">{salary}</Badge>}
            <Badge tone="muted">{job.source.replace(/_/g, " ")}</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
