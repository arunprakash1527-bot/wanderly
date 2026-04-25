import { callClaude } from "./claude";
import type { CvFormat, CoverLetterStyle } from "@/lib/types";

export interface TailoredCv {
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    start: string;
    end: string | null;
    bullets: string[];
  }>;
  education: Array<{ school: string; qualification: string; end: string | null }>;
  highlights: string[];
}

export async function tailorCv(args: {
  baseCv: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  format: CvFormat;
}) {
  const system = `You are an expert career coach who customises CVs for specific roles.
You preserve every factual claim from the candidate's base CV. You never invent experience,
qualifications, dates, or metrics. You re-order, re-phrase, and emphasise relevant points.
You write in concise, achievement-led prose with strong verbs and quantified impact.`;

  const formatGuide: Record<CvFormat, string> = {
    ats_clean: "Single-column ATS-friendly layout. No graphics. Plain section headings. Maximum readability for keyword scanning.",
    modern: "Modern professional layout. Concise summary, clear skill clusters, achievement bullets.",
    executive: "Executive-style. Lead with strategic impact, scope of responsibility, and outcomes. Sparse, high signal.",
  };

  const user = `BASE CV:
"""
${args.baseCv}
"""

TARGET ROLE:
Title: ${args.jobTitle}
Company: ${args.jobCompany}
Description:
"""
${args.jobDescription}
"""

FORMAT GUIDANCE: ${formatGuide[args.format]}

Return JSON of shape:
{
  "summary": string,
  "skills": string[],
  "experience": [{ "company": string, "title": string, "start": string, "end": string | null, "bullets": string[] }],
  "education": [{ "school": string, "qualification": string, "end": string | null }],
  "highlights": string[]
}`;

  const r = await callClaude({ system, user, maxTokens: 3000, json: true });
  const cv = JSON.parse(r.text) as TailoredCv;
  return { cv, usage: r };
}

export async function generateCoverLetter(args: {
  baseCv: string;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  style: CoverLetterStyle;
  candidateName?: string;
}) {
  const system = `You write cover letters that read like they were written by the candidate.
You ground every claim in evidence from the CV. You avoid clichés ("dynamic team player",
"passionate about", "results-driven"). You write in active voice with specific examples.`;

  const styleGuide: Record<CoverLetterStyle, string> = {
    formal: "Formal register. Traditional structure: hook, fit, value, close. ~280 words.",
    conversational: "Warm, direct, first-person. Light contractions OK. ~250 words.",
    narrative: "Open with a short story moment that frames why this role. ~320 words.",
  };

  const user = `CANDIDATE CV:
"""
${args.baseCv}
"""

TARGET ROLE:
Title: ${args.jobTitle}
Company: ${args.jobCompany}
Description:
"""
${args.jobDescription}
"""

STYLE: ${styleGuide[args.style]}
CANDIDATE NAME: ${args.candidateName ?? "[Candidate Name]"}

Return only the letter body as plain text. No subject line, no salutation block, no signature.
Do not invent facts that are not present in the CV.`;

  const r = await callClaude({ system, user, maxTokens: 1200 });
  return { letter: r.text, usage: r };
}

export async function extractCvText(rawText: string) {
  // Pass-through when text is already clean. Hook left for future PDF parsing.
  return rawText.trim();
}
