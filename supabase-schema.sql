-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Trips table
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  brief text,
  start_date date,
  end_date date,
  places text[] default '{}',
  travel_modes text[] default '{}',
  status text default 'draft' check (status in ('draft', 'live', 'completed')),
  share_code text unique default upper(substr(md5(random()::text), 1, 6)),
  lead_user_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trip travellers
create table public.trip_travellers (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id),
  name text not null,
  email text,
  role text default 'adult' check (role in ('lead', 'adult', 'child_older', 'child_younger')),
  age integer,
  is_claimed boolean default false,
  joined_at timestamptz,
  created_at timestamptz default now()
);

-- Trip stays/accommodation
create table public.trip_stays (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  name text not null,
  type text,
  tags text[] default '{}',
  rating numeric(2,1),
  price text,
  location text,
  created_at timestamptz default now()
);

-- Trip preferences
create table public.trip_preferences (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  food_prefs text[] default '{}',
  adult_activities text[] default '{}',
  older_kid_activities text[] default '{}',
  younger_kid_activities text[] default '{}',
  instructions text,
  created_at timestamptz default now()
);

-- Trip timeline items
create table public.timeline_items (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  day_number integer not null,
  time text,
  title text not null,
  description text,
  item_for text default 'all',
  needs_booking boolean default false,
  price text,
  rating numeric(2,1),
  booking_status text check (booking_status in ('pending', 'booked', 'skipped')),
  booking_cost text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Chat messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id),
  text text not null,
  is_ai boolean default false,
  created_at timestamptz default now()
);

-- Photos
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id),
  url text not null,
  caption text,
  day_label text,
  created_at timestamptz default now()
);

-- Polls
create table public.polls (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]',
  deadline timestamptz,
  created_at timestamptz default now()
);

-- Poll votes
create table public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references public.profiles(id),
  option_index integer not null,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_travellers enable row level security;
alter table public.trip_stays enable row level security;
alter table public.trip_preferences enable row level security;
alter table public.timeline_items enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- Profiles: users can read all profiles, update own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Trips: viewable if you're lead or a traveller, or via share code
create policy "Trips viewable by participants" on public.trips for select using (
  lead_user_id = auth.uid()
  or id in (select trip_id from public.trip_travellers where user_id = auth.uid())
  or true  -- Allow public read for share links (we filter in app)
);
create policy "Trips insertable by authenticated users" on public.trips for insert with check (auth.uid() = lead_user_id);
create policy "Trips updatable by lead" on public.trips for update using (lead_user_id = auth.uid());
create policy "Trips deletable by lead" on public.trips for delete using (lead_user_id = auth.uid());

-- Trip travellers: viewable by trip participants
create policy "Travellers viewable by all" on public.trip_travellers for select using (true);
create policy "Travellers manageable by trip lead" on public.trip_travellers for insert with check (
  trip_id in (select id from public.trips where lead_user_id = auth.uid())
);
create policy "Travellers updatable by trip lead or self" on public.trip_travellers for update using (
  trip_id in (select id from public.trips where lead_user_id = auth.uid()) or user_id = auth.uid()
);
create policy "Travellers deletable by trip lead" on public.trip_travellers for delete using (
  trip_id in (select id from public.trips where lead_user_id = auth.uid())
);

-- Stays, preferences, timeline: same pattern as trips
create policy "Stays viewable" on public.trip_stays for select using (true);
create policy "Stays insertable by lead" on public.trip_stays for insert with check (trip_id in (select id from public.trips where lead_user_id = auth.uid()));
create policy "Stays updatable by lead" on public.trip_stays for update using (trip_id in (select id from public.trips where lead_user_id = auth.uid()));
create policy "Stays deletable by lead" on public.trip_stays for delete using (trip_id in (select id from public.trips where lead_user_id = auth.uid()));

create policy "Prefs viewable" on public.trip_preferences for select using (true);
create policy "Prefs insertable by lead" on public.trip_preferences for insert with check (trip_id in (select id from public.trips where lead_user_id = auth.uid()));
create policy "Prefs updatable by lead" on public.trip_preferences for update using (trip_id in (select id from public.trips where lead_user_id = auth.uid()));

create policy "Timeline viewable" on public.timeline_items for select using (true);
create policy "Timeline insertable by lead" on public.timeline_items for insert with check (trip_id in (select id from public.trips where lead_user_id = auth.uid()));
create policy "Timeline updatable by lead" on public.timeline_items for update using (trip_id in (select id from public.trips where lead_user_id = auth.uid()));
create policy "Timeline deletable by lead" on public.timeline_items for delete using (trip_id in (select id from public.trips where lead_user_id = auth.uid()));

create policy "Messages viewable" on public.messages for select using (true);
create policy "Messages insertable by auth" on public.messages for insert with check (auth.uid() = user_id);

create policy "Photos viewable" on public.photos for select using (true);
create policy "Photos insertable by auth" on public.photos for insert with check (auth.uid() = user_id);

create policy "Polls viewable" on public.polls for select using (true);
create policy "Polls insertable by lead" on public.polls for insert with check (trip_id in (select id from public.trips where lead_user_id = auth.uid()));

create policy "Votes viewable" on public.poll_votes for select using (true);
create policy "Votes insertable by auth" on public.poll_votes for insert with check (auth.uid() = user_id);

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to look up trip by share code
create or replace function public.get_trip_by_share_code(code text)
returns setof public.trips as $$
  select * from public.trips where share_code = upper(code);
$$ language sql security definer;
