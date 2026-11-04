-- =========================================================================
-- CARMEL POLYTECHNIC COLLEGE TEST PORTAL - SUPABASE DATABASE SCHEMA
-- Run this complete script in your Supabase Project -> SQL Editor -> Run
-- =========================================================================

-- 1. Create table for Exam Configuration & Operational Controls
create table if not exists public.exam_config (
  id text primary key default 'default_config',
  title text not null default 'Carmel Technical Assessment & Aptitude Test 2026',
  institute_name text not null default 'CARMEL POLYTECHNIC COLLEGE PUNNAPRA',
  institute_subtitle text not null default 'Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004',
  common_password text not null default 'CARMEL2026',
  duration_minutes integer not null default 30,
  is_exam_live boolean not null default true,
  exam_status text not null default 'RUNNING', -- 'RUNNING', 'PAUSED', 'STOPPED'
  global_restart_timestamp bigint,
  randomize_questions boolean not null default true,
  auto_submit_on_time_up boolean not null default true,
  admin_pin text not null default 'admin@carmelpoly.in',
  app_number_prefix text not null default 'CARMEL',
  updated_at timestamptz default now()
);

-- 2. Create table for Question Bank
create table if not exists public.questions (
  id text primary key,
  question text not null,
  options jsonb not null, -- Array of 4 string options [A, B, C, D]
  correct_option text not null, -- 'A', 'B', 'C', or 'D'
  marks integer not null default 1,
  created_at timestamptz default now()
);

-- 3. Create table for Candidate Roster & Live Assessment Sessions
create table if not exists public.candidates (
  id text primary key,
  application_number text,
  phone text not null,
  name text not null,
  roll_no text,
  department text,
  status text not null default 'NOT_STARTED', -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVOKED'
  started_at bigint,
  completed_at bigint,
  time_taken_seconds integer,
  answers jsonb default '{}'::jsonb, -- Map of { questionId: "A" }
  score integer default 0,
  current_question_index integer default 0,
  shuffled_question_ids jsonb default '[]'::jsonb,
  restarted_at bigint,
  revoked_at bigint,
  updated_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS) with full Public Access via Supabase Anon Key
alter table public.exam_config enable row level security;
alter table public.questions enable row level security;
alter table public.candidates enable row level security;

-- Policy for exam_config
drop policy if exists "Allow anon full access on exam_config" on public.exam_config;
create policy "Allow anon full access on exam_config" on public.exam_config
  for all using (true) with check (true);

-- Policy for questions
drop policy if exists "Allow anon full access on questions" on public.questions;
create policy "Allow anon full access on questions" on public.questions
  for all using (true) with check (true);

-- Policy for candidates
drop policy if exists "Allow anon full access on candidates" on public.candidates;
create policy "Allow anon full access on candidates" on public.candidates
  for all using (true) with check (true);

-- 5. Enable Realtime Publications for instantaneous multi-device cross-network synchronization
alter publication supabase_realtime add table public.exam_config;
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.candidates;

-- 6. Insert initial seed configuration if not exists
insert into public.exam_config (
  id,
  title,
  institute_name,
  institute_subtitle,
  common_password,
  duration_minutes,
  is_exam_live,
  exam_status,
  admin_pin,
  app_number_prefix
) values (
  'default_config',
  'Carmel Technical Assessment & Aptitude Test 2026',
  'CARMEL POLYTECHNIC COLLEGE PUNNAPRA',
  'Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004',
  'CARMEL2026',
  30,
  true,
  'RUNNING',
  'admin@carmelpoly.in',
  'CARMEL'
) on conflict (id) do nothing;

