-- Pathway: schema for Supabase Postgres
-- Idempotent: safe to re-run. Apply in Supabase SQL editor.

create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- =====================================================================
-- PROFILES (extends auth.users)
-- =====================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  base_cv_url text,
  base_cv_text text,
  plan_tier text not null default 'free' check (plan_tier in ('free','pro','team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function tg_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function tg_set_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- PREFERENCES
-- =====================================================================
create table if not exists preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_keywords text[] not null default '{}',
  locations text[] not null default '{}',
  seniority_levels text[] not null default '{}',
  work_models text[] not null default '{}',          -- remote/hybrid/onsite
  employment_types text[] not null default '{}',     -- full_time/contract/etc
  salary_floor int,
  salary_currency text default 'GBP',
  include_keywords text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  company_types text[] not null default '{}',        -- bank/fintech/big_tech/ai_lab/saas
  updated_at timestamptz not null default now()
);

drop trigger if exists preferences_updated_at on preferences;
create trigger preferences_updated_at before update on preferences
  for each row execute function tg_set_updated_at();

-- =====================================================================
-- SAVED SEARCHES (max 50 enforced at app layer)
-- =====================================================================
create table if not exists saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  query jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on saved_searches (user_id, created_at desc);

-- =====================================================================
-- JOBS (public read; deduped on canonical_url)
-- =====================================================================
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  source text not null,                    -- greenhouse|lever|ashby|apify_linkedin|adzuna
  source_id text,
  canonical_url text not null unique,
  title text not null,
  company text not null,
  company_logo_url text,
  company_type text,                       -- bank|fintech|big_tech|ai_lab|saas|other
  location text,
  country text,
  work_model text,                         -- remote|hybrid|onsite
  seniority text,                          -- entry|mid|senior|staff|principal|director|vp|csuite
  employment_type text,                    -- full_time|contract|internship|fixed_term
  years_experience text,
  salary_min int,
  salary_max int,
  salary_currency text,
  description text,
  description_tsv tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
      setweight(to_tsvector('english', coalesce(company,'')), 'B') ||
      setweight(to_tsvector('english', coalesce(description,'')), 'C')
    ) stored,
  posted_at timestamptz,
  expires_at timestamptz,
  raw jsonb,
  ingested_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists jobs_posted_idx on jobs (posted_at desc nulls last);
create index if not exists jobs_company_idx on jobs (company);
create index if not exists jobs_location_idx on jobs (location);
create index if not exists jobs_tsv_idx on jobs using gin (description_tsv);
create index if not exists jobs_title_trgm_idx on jobs using gin (title gin_trgm_ops);

create table if not exists job_tags (
  job_id uuid not null references jobs(id) on delete cascade,
  tag text not null,
  primary key (job_id, tag)
);

-- =====================================================================
-- USER ↔ JOB INTERACTIONS
-- =====================================================================
create table if not exists saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table if not exists hidden_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type application_status as enum
      ('saved','applied','interviewing','offer','rejected','withdrawn');
  end if;
end $$;

create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete restrict,
  status application_status not null default 'saved',
  applied_at timestamptz,
  notes text,
  tailored_cv_url text,
  cover_letter_url text,
  last_status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index if not exists applications_user_idx on applications (user_id, last_status_at desc);

-- =====================================================================
-- AI GENERATIONS (cache + audit + cost tracking)
-- =====================================================================
create table if not exists ai_generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  kind text not null check (kind in ('cv','cover_letter','interview_prep','mock_interview')),
  format text,
  input_hash text not null,
  content text,
  file_url text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_cents int,
  created_at timestamptz not null default now()
);
create index if not exists ai_gen_user_idx on ai_generations (user_id, created_at desc);
create index if not exists ai_gen_cache_idx on ai_generations (user_id, job_id, kind, input_hash);

-- =====================================================================
-- USAGE EVENTS (for billing analytics + rate limits)
-- =====================================================================
create table if not exists usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,                       -- ai.cv | ai.cover_letter | apply | search | ...
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_kind_idx on usage_events (user_id, kind, created_at desc);

-- =====================================================================
-- SUBSCRIPTIONS (Stripe-ready, populated via webhook)
-- =====================================================================
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function tg_set_updated_at();

-- =====================================================================
-- ROW-LEVEL SECURITY
-- =====================================================================
alter table profiles            enable row level security;
alter table preferences         enable row level security;
alter table saved_searches      enable row level security;
alter table saved_jobs          enable row level security;
alter table hidden_jobs         enable row level security;
alter table applications        enable row level security;
alter table ai_generations      enable row level security;
alter table usage_events        enable row level security;
alter table subscriptions       enable row level security;
alter table jobs                enable row level security;
alter table job_tags            enable row level security;

-- Public read on jobs / job_tags
drop policy if exists "jobs_public_read" on jobs;
create policy "jobs_public_read" on jobs for select using (true);
drop policy if exists "job_tags_public_read" on job_tags;
create policy "job_tags_public_read" on job_tags for select using (true);

-- Per-user policies
do $$ declare
  t text;
begin
  for t in select unnest(array[
    'profiles','preferences','saved_searches','saved_jobs','hidden_jobs',
    'applications','ai_generations','usage_events','subscriptions'
  ]) loop
    execute format('drop policy if exists "%1$s_owner_select" on %1$s', t);
    execute format('drop policy if exists "%1$s_owner_modify" on %1$s', t);
    -- profiles uses id; others use user_id
    if t = 'profiles' then
      execute format('create policy "%1$s_owner_select" on %1$s for select using (auth.uid() = id)', t);
      execute format('create policy "%1$s_owner_modify" on %1$s for all using (auth.uid() = id) with check (auth.uid() = id)', t);
    else
      execute format('create policy "%1$s_owner_select" on %1$s for select using (auth.uid() = user_id)', t);
      execute format('create policy "%1$s_owner_modify" on %1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    end if;
  end loop;
end $$;

-- =====================================================================
-- STORAGE BUCKETS (run separately if not auto-created by app)
-- =====================================================================
-- insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('generated', 'generated', false) on conflict do nothing;
