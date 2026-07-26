-- Braindump: AI-sorted notes app
-- Run this migration in your Supabase SQL editor

-- Categories table (created first since notes references it)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#3060D4',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_categories_user on categories(user_id);

-- Notes table
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  category_id uuid references categories(id) on delete set null,
  priority integer not null default 2 check (priority between 1 and 3),
  status text not null default 'active' check (status in ('active', 'done')),
  ai_suggested_category text,
  ai_suggested_priority integer check (ai_suggested_priority is null or ai_suggested_priority between 1 and 3),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notes_user on notes(user_id);
create index idx_notes_user_status on notes(user_id, status);
create index idx_notes_user_priority on notes(user_id, priority);
create index idx_notes_category on notes(category_id);

-- Comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_comments_note on comments(note_id);

-- Auto-update updated_at on notes
create or replace function update_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
  before update on notes
  for each row execute function update_notes_updated_at();

-- Row-Level Security
alter table notes enable row level security;
alter table categories enable row level security;
alter table comments enable row level security;

create policy "notes_select" on notes for select using (auth.uid() = user_id);
create policy "notes_insert" on notes for insert with check (auth.uid() = user_id);
create policy "notes_update" on notes for update using (auth.uid() = user_id);
create policy "notes_delete" on notes for delete using (auth.uid() = user_id);

create policy "categories_select" on categories for select using (auth.uid() = user_id);
create policy "categories_insert" on categories for insert with check (auth.uid() = user_id);
create policy "categories_update" on categories for update using (auth.uid() = user_id);
create policy "categories_delete" on categories for delete using (auth.uid() = user_id);

create policy "comments_select" on comments for select
  using (auth.uid() = user_id);
create policy "comments_insert" on comments for insert
  with check (auth.uid() = user_id);
create policy "comments_update" on comments for update
  using (auth.uid() = user_id);
create policy "comments_delete" on comments for delete
  using (auth.uid() = user_id);
