-- CertCoach Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- EXAMS
-- ============================================================
create table exams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  provider text not null default '',
  description text,
  exam_date date,
  is_shared boolean not null default false,
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table exams enable row level security;
create policy "Users can view own exams" on exams for select using (auth.uid() = user_id);
create policy "Users can insert own exams" on exams for insert with check (auth.uid() = user_id);
create policy "Users can update own exams" on exams for update using (auth.uid() = user_id);
create policy "Users can delete own exams" on exams for delete using (auth.uid() = user_id);

create index idx_exams_user_id on exams(user_id);

-- ============================================================
-- CHAPTERS
-- ============================================================
create table chapters (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  status text not null default 'not_started' check (status in ('not_started', 'reading', 'quizzed', 'mastered')),
  coaching_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chapters enable row level security;
create policy "Users can view own chapters" on chapters for select
  using (exists (select 1 from exams where exams.id = chapters.exam_id and exams.user_id = auth.uid()));
create policy "Users can insert own chapters" on chapters for insert
  with check (exists (select 1 from exams where exams.id = chapters.exam_id and exams.user_id = auth.uid()));
create policy "Users can update own chapters" on chapters for update
  using (exists (select 1 from exams where exams.id = chapters.exam_id and exams.user_id = auth.uid()));
create policy "Users can delete own chapters" on chapters for delete
  using (exists (select 1 from exams where exams.id = chapters.exam_id and exams.user_id = auth.uid()));

create index idx_chapters_exam_id on chapters(exam_id);

-- ============================================================
-- MATERIALS
-- ============================================================
create table materials (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'image', 'note', 'text')),
  storage_path text not null,
  extracted_text text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending', 'done', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table materials enable row level security;
create policy "Users can view own materials" on materials for select
  using (exists (select 1 from exams where exams.id = materials.exam_id and exams.user_id = auth.uid()));
create policy "Users can insert own materials" on materials for insert
  with check (exists (select 1 from exams where exams.id = materials.exam_id and exams.user_id = auth.uid()));
create policy "Users can update own materials" on materials for update
  using (exists (select 1 from exams where exams.id = materials.exam_id and exams.user_id = auth.uid()));
create policy "Users can delete own materials" on materials for delete
  using (exists (select 1 from exams where exams.id = materials.exam_id and exams.user_id = auth.uid()));

create index idx_materials_exam_id on materials(exam_id);
create index idx_materials_chapter_id on materials(chapter_id);

-- ============================================================
-- SAMPLE QUESTIONS (real exam exemplars)
-- ============================================================
create table sample_questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  source text not null default 'unknown',
  stem text not null,
  options jsonb,
  correct_answer text,
  raw_image_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sample_questions enable row level security;
create policy "Users can view own sample_questions" on sample_questions for select
  using (exists (select 1 from exams where exams.id = sample_questions.exam_id and exams.user_id = auth.uid()));
create policy "Users can insert own sample_questions" on sample_questions for insert
  with check (exists (select 1 from exams where exams.id = sample_questions.exam_id and exams.user_id = auth.uid()));
create policy "Users can update own sample_questions" on sample_questions for update
  using (exists (select 1 from exams where exams.id = sample_questions.exam_id and exams.user_id = auth.uid()));
create policy "Users can delete own sample_questions" on sample_questions for delete
  using (exists (select 1 from exams where exams.id = sample_questions.exam_id and exams.user_id = auth.uid()));

create index idx_sample_questions_exam_id on sample_questions(exam_id);

-- ============================================================
-- GENERATED MCQs
-- ============================================================
create table generated_mcqs (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  stem text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text not null default '',
  topic_tag text not null default '',
  difficulty integer not null default 1 check (difficulty between 1 and 3),
  generated_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table generated_mcqs enable row level security;
create policy "Users can view own generated_mcqs" on generated_mcqs for select
  using (exists (select 1 from exams where exams.id = generated_mcqs.exam_id and exams.user_id = auth.uid()));
create policy "Users can insert own generated_mcqs" on generated_mcqs for insert
  with check (exists (select 1 from exams where exams.id = generated_mcqs.exam_id and exams.user_id = auth.uid()));
create policy "Users can update own generated_mcqs" on generated_mcqs for update
  using (exists (select 1 from exams where exams.id = generated_mcqs.exam_id and exams.user_id = auth.uid()));
create policy "Users can delete own generated_mcqs" on generated_mcqs for delete
  using (exists (select 1 from exams where exams.id = generated_mcqs.exam_id and exams.user_id = auth.uid()));

create index idx_generated_mcqs_exam_id on generated_mcqs(exam_id);
create index idx_generated_mcqs_chapter_id on generated_mcqs(chapter_id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
create table quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  mcq_id uuid not null references generated_mcqs(id) on delete cascade,
  chosen_index integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

alter table quiz_attempts enable row level security;
create policy "Users can view own quiz_attempts" on quiz_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own quiz_attempts" on quiz_attempts for insert with check (auth.uid() = user_id);

create index idx_quiz_attempts_user_id on quiz_attempts(user_id);
create index idx_quiz_attempts_exam_id on quiz_attempts(exam_id);
create index idx_quiz_attempts_mcq_id on quiz_attempts(mcq_id);

-- ============================================================
-- USAGE TRACKING (for metering AI calls)
-- ============================================================
create table usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  mcq_generations integer not null default 0,
  coaching_calls integer not null default 0,
  extraction_calls integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month)
);

alter table usage enable row level security;
create policy "Users can view own usage" on usage for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on usage for insert with check (auth.uid() = user_id);
create policy "Users can update own usage" on usage for update using (auth.uid() = user_id);

-- ============================================================
-- READINESS VIEW
-- ============================================================
create or replace view chapter_readiness as
select
  qa.user_id,
  qa.exam_id,
  qa.chapter_id,
  count(*) as total_attempts,
  count(*) filter (where qa.is_correct) as correct_count,
  round(
    (count(*) filter (where qa.is_correct))::numeric / nullif(count(*), 0) * 100,
    1
  ) as percent_correct,
  max(qa.answered_at) as last_attempt
from quiz_attempts qa
group by qa.user_id, qa.exam_id, qa.chapter_id;

create or replace view exam_readiness as
select
  qa.user_id,
  qa.exam_id,
  count(*) as total_attempts,
  count(*) filter (where qa.is_correct) as correct_count,
  round(
    (count(*) filter (where qa.is_correct))::numeric / nullif(count(*), 0) * 100,
    1
  ) as percent_correct,
  count(distinct qa.chapter_id) as chapters_attempted,
  max(qa.answered_at) as last_attempt
from quiz_attempts qa
group by qa.user_id, qa.exam_id;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on exams for each row execute function update_updated_at();
create trigger set_updated_at before update on chapters for each row execute function update_updated_at();
create trigger set_updated_at before update on materials for each row execute function update_updated_at();
create trigger set_updated_at before update on sample_questions for each row execute function update_updated_at();
create trigger set_updated_at before update on generated_mcqs for each row execute function update_updated_at();
create trigger set_updated_at before update on usage for each row execute function update_updated_at();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "Users can upload materials" on storage.objects for insert
  with check (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can view own materials" on storage.objects for select
  using (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own materials" on storage.objects for delete
  using (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);
