"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterState {
  q: string;
  seniority: string[];
  workModel: string[];
}

const SENIORITIES = [
  { id: "entry", label: "Entry" },
  { id: "mid", label: "Mid" },
  { id: "senior", label: "Senior" },
  { id: "staff", label: "Staff" },
  { id: "principal", label: "Principal" },
  { id: "director", label: "Director" },
  { id: "vp", label: "VP" },
];

const WORK_MODELS = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "Onsite" },
];

export function Filters({ value, onChange }: { value: FilterState; onChange: (v: FilterState) => void }) {
  function toggle(key: "seniority" | "workModel", id: string) {
    const arr = value[key];
    onChange({ ...value, [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] });
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-muted pointer-events-none" />
        <Input
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="Search title, company, keyword…"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {SENIORITIES.map((s) => (
          <Chip key={s.id} active={value.seniority.includes(s.id)} onClick={() => toggle("seniority", s.id)}>
            {s.label}
          </Chip>
        ))}
        <span className="w-px bg-border mx-1" />
        {WORK_MODELS.map((s) => (
          <Chip key={s.id} active={value.workModel.includes(s.id)} onClick={() => toggle("workModel", s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full border text-xs transition-colors",
        active ? "bg-accent text-accent-fg border-transparent" : "bg-surface text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
