export type Seniority =
  | "entry" | "mid" | "senior" | "staff" | "principal" | "director" | "vp" | "csuite";

export type WorkModel = "remote" | "hybrid" | "onsite";
export type CompanyType = "bank" | "fintech" | "big_tech" | "ai_lab" | "saas" | "consulting" | "other";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "fixed_term";

export interface NormalizedJob {
  source: string;
  source_id?: string;
  canonical_url: string;
  title: string;
  company: string;
  company_logo_url?: string | null;
  company_type?: CompanyType | null;
  location?: string | null;
  country?: string | null;
  work_model?: WorkModel | null;
  seniority?: Seniority | null;
  employment_type?: EmploymentType | null;
  years_experience?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  description?: string | null;
  posted_at?: string | null;
  raw?: unknown;
}

export interface Preferences {
  user_id: string;
  role_keywords: string[];
  locations: string[];
  seniority_levels: Seniority[];
  work_models: WorkModel[];
  employment_types: EmploymentType[];
  salary_floor: number | null;
  salary_currency: string | null;
  include_keywords: string[];
  exclude_keywords: string[];
  company_types: CompanyType[];
}

export type ApplicationStatus =
  | "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

export type CvFormat = "ats_clean" | "modern" | "executive";
export type CoverLetterStyle = "formal" | "conversational" | "narrative";
