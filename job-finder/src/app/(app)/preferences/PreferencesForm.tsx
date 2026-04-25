"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";

const SENIORITIES = ["entry", "mid", "senior", "staff", "principal", "director", "vp"] as const;
const WORK_MODELS = ["remote", "hybrid", "onsite"] as const;
const COMPANY_TYPES = ["bank", "fintech", "big_tech", "ai_lab", "saas", "consulting", "other"] as const;

interface Prefs {
  role_keywords?: string[]; locations?: string[]; seniority_levels?: string[];
  work_models?: string[]; employment_types?: string[];
  salary_floor?: number | null; salary_currency?: string | null;
  include_keywords?: string[]; exclude_keywords?: string[]; company_types?: string[];
}

export function PreferencesForm({
  initialPrefs, initialCv, initialName,
}: { initialPrefs: Prefs | null; initialCv: string; initialName: string }) {
  const [roleInput, setRoleInput] = useState((initialPrefs?.role_keywords ?? []).join(", "));
  const [locationInput, setLocationInput] = useState((initialPrefs?.locations ?? []).join(", "));
  const [seniority, setSeniority] = useState<string[]>(initialPrefs?.seniority_levels ?? []);
  const [workModels, setWorkModels] = useState<string[]>(initialPrefs?.work_models ?? []);
  const [companyTypes, setCompanyTypes] = useState<string[]>(initialPrefs?.company_types ?? []);
  const [salaryFloor, setSalaryFloor] = useState<string>(initialPrefs?.salary_floor?.toString() ?? "");
  const [include, setInclude] = useState((initialPrefs?.include_keywords ?? []).join(", "));
  const [exclude, setExclude] = useState((initialPrefs?.exclude_keywords ?? []).join(", "));
  const [name, setName] = useState(initialName);
  const [cv, setCv] = useState(initialCv);
  const [saving, setSaving] = useState<"idle" | "prefs" | "cv">("idle");
  const [savedPrefs, setSavedPrefs] = useState(false);
  const [savedCv, setSavedCv] = useState(false);

  function toggle(arr: string[], setter: (v: string[]) => void, v: string) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function savePrefs() {
    setSaving("prefs");
    const body = {
      role_keywords: split(roleInput),
      locations: split(locationInput),
      seniority_levels: seniority,
      work_models: workModels,
      employment_types: [],
      salary_floor: salaryFloor ? parseInt(salaryFloor, 10) : null,
      salary_currency: "GBP",
      include_keywords: split(include),
      exclude_keywords: split(exclude),
      company_types: companyTypes,
    };
    const r = await fetch("/api/preferences", {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving("idle");
    if (r.ok) { setSavedPrefs(true); setTimeout(() => setSavedPrefs(false), 1500); }
  }

  async function saveCv() {
    setSaving("cv");
    const r = await fetch("/api/cv/upload", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: cv, fullName: name || undefined }),
    });
    setSaving("idle");
    if (r.ok) { setSavedCv(true); setTimeout(() => setSavedCv(false), 1500); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="font-medium">Your CV</h2></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <Label>Base CV (paste plain text)</Label>
            <Textarea
              value={cv} onChange={(e) => setCv(e.target.value)}
              placeholder="Paste your CV as plain text. The AI will tailor it per role."
              className="min-h-[260px] font-mono text-xs"
            />
            <p className="text-[11px] text-fg-muted mt-1.5">PDF upload coming soon. For now paste the text.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveCv} disabled={saving !== "idle" || cv.trim().length < 80}>
              {saving === "cv" ? <><Loader2 className="size-4 animate-spin" />Saving…</> : savedCv ? <><Check className="size-4" />Saved</> : "Save CV"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-medium">Search preferences</h2></CardHeader>
        <CardBody className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Role keywords (comma-separated)</Label>
              <Input value={roleInput} onChange={(e) => setRoleInput(e.target.value)}
                placeholder="Product Manager, AI Product Manager" />
            </div>
            <div>
              <Label>Locations</Label>
              <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)}
                placeholder="London, Remote UK" />
            </div>
          </div>

          <div>
            <Label>Seniority</Label>
            <ChipRow values={SENIORITIES as readonly string[]} selected={seniority} onToggle={(v) => toggle(seniority, setSeniority, v)} />
          </div>

          <div>
            <Label>Work model</Label>
            <ChipRow values={WORK_MODELS as readonly string[]} selected={workModels} onToggle={(v) => toggle(workModels, setWorkModels, v)} />
          </div>

          <div>
            <Label>Company types</Label>
            <ChipRow values={COMPANY_TYPES as readonly string[]} selected={companyTypes} onToggle={(v) => toggle(companyTypes, setCompanyTypes, v)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Salary floor (GBP, annual)</Label>
              <Input type="number" inputMode="numeric" value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)} placeholder="120000" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Must include keywords</Label>
              <Input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="LLM, payments" />
            </div>
            <div>
              <Label>Exclude keywords</Label>
              <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="crypto, security clearance" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={savePrefs} disabled={saving !== "idle"}>
              {saving === "prefs" ? <><Loader2 className="size-4 animate-spin" />Saving…</> :
               savedPrefs ? <><Check className="size-4" />Saved</> : "Save preferences"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function split(s: string) {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function ChipRow({ values, selected, onToggle }: { values: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const active = selected.includes(v);
        return (
          <button
            key={v} type="button" onClick={() => onToggle(v)}
            className={
              "h-8 px-3 rounded-full border text-xs capitalize transition-colors " +
              (active ? "bg-accent text-accent-fg border-transparent" : "bg-surface text-fg-muted hover:text-fg")
            }
          >
            {v.replace(/_/g, " ")}
          </button>
        );
      })}
    </div>
  );
}
