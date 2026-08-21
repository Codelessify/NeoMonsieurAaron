-- ═══════════════════════════════════════════════════════════════════
-- MonsieurAaron — Supabase Schema Migration
-- Run this in Supabase SQL Editor to create all tables
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users (extends Supabase Auth) ──────────────────────────────────
create table public.user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  level        text not null default 'A0' check (level in ('A0','A1','A2','B1','B2')),
  xp           integer not null default 0,
  streak       integer not null default 0,
  last_active  timestamptz not null default now(),
  daily_goal_minutes integer not null default 10,
  context_language text not null default 'english' check (context_language in ('english','french','mixed')),
  audio_autoplay boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);

-- ─── Learner Inventory (vocabulary tracking) ─────────────────────────
create table public.learner_inventory (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  word       text not null,
  type       text not null check (type in ('verb','noun','pattern','question_pattern','time','connector','adjective','other')),
  english    text,
  times_seen integer not null default 1,
  last_seen  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

alter table public.learner_inventory enable row level security;

create policy "Users manage own inventory"
  on public.learner_inventory for all using (auth.uid() = user_id);

-- ─── Episodes (cached generated episodes) ────────────────────────────
create table public.episodes (
  id           uuid primary key default uuid_generate_v4(),
  lesson_id    text not null,
  user_id      uuid references auth.users(id) on delete set null, -- null = canonical
  episode_title text not null,
  theme        text not null,
  estimated_duration_minutes integer not null default 8,
  scenes       jsonb not null,     -- array of Scene objects
  created_at   timestamptz not null default now()
);

alter table public.episodes enable row level security;

create policy "Canonical episodes readable by all authenticated users"
  on public.episodes for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own episodes"
  on public.episodes for insert
  with check (auth.uid() = user_id or user_id is null);

-- ─── Learner Progress ────────────────────────────────────────────────
create table public.learner_progress (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       text not null,
  episode_id      uuid references public.episodes(id) on delete set null,
  score           integer not null default 0 check (score between 0 and 100),
  scenes_correct  integer not null default 0,
  total_scenes    integer not null default 10,
  completed       boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.learner_progress enable row level security;

create policy "Users manage own progress"
  on public.learner_progress for all using (auth.uid() = user_id);

-- ─── Trigger: auto-create user_profile on signup ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
