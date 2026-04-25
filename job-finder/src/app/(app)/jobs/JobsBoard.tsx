"use client";
import { useMemo, useState } from "react";
import { JobCard, type JobCardData } from "@/components/job/JobCard";
import { JobDetailDrawer } from "@/components/job/JobDetailDrawer";
import { Filters, type FilterState } from "@/components/job/Filters";

type Job = JobCardData & {
  description: string | null;
  years_experience: string | null;
  employment_type: string | null;
};

export function JobsBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [filter, setFilter] = useState<FilterState>({ q: "", seniority: [], workModel: [] });
  const [active, setActive] = useState<Job | null>(null);

  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return initialJobs.filter((j) => {
      if (q) {
        const hay = `${j.title} ${j.company} ${j.location ?? ""} ${j.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter.seniority.length && (!j.seniority || !filter.seniority.includes(j.seniority))) return false;
      if (filter.workModel.length && (!j.work_model || !filter.workModel.includes(j.work_model))) return false;
      return true;
    });
  }, [initialJobs, filter]);

  return (
    <div className="grid gap-6">
      <Filters value={filter} onChange={setFilter} />
      <div className="text-xs text-fg-muted">
        {filtered.length} of {initialJobs.length} {initialJobs.length === 1 ? "role" : "roles"}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((j) => (
          <JobCard key={j.id} job={j} onSelect={() => setActive(j)} />
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 rounded-2xl border bg-surface p-10 text-center text-sm text-fg-muted">
            No jobs match these filters. Widen seniority or clear the search.
          </div>
        )}
      </div>
      <JobDetailDrawer job={active} onClose={() => setActive(null)} />
    </div>
  );
}
