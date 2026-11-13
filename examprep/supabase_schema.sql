-- ============================================================
--  ExamPrep - Supabase Database Schema
--  Run this in your Supabase SQL Editor
--  (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  streak integer not null default 0,
  last_login timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2. PDF FILES (metadata — actual files go in Storage)
create table if not exists public.pdf_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  url text not null,
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

-- 3. QUIZ RESULTS
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pdf_name text not null default '',
  score integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. EXAMS
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  exam_date date not null,
  created_at timestamptz not null default now()
);

-- 5. SCHEDULES (stores the full AI-generated schedule as JSON)
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  schedule_data text not null,
  created_at timestamptz not null default now()
);

-- 6. ZEN SESSIONS
create table if not exists public.zen_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  duration_minutes integer not null default 0,
  blocked_apps text[] not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.pdf_files enable row level security;
alter table public.quiz_results enable row level security;
alter table public.exams enable row level security;
alter table public.schedules enable row level security;
alter table public.zen_sessions enable row level security;

-- Profiles: users can only see/edit their own
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id);

-- PDF Files: users can only access their own
create policy "pdf_files_self" on public.pdf_files
  for all using (auth.uid() = user_id);

-- Quiz Results: users can only access their own
create policy "quiz_results_self" on public.quiz_results
  for all using (auth.uid() = user_id);

-- Exams: users can only access their own
create policy "exams_self" on public.exams
  for all using (auth.uid() = user_id);

-- Schedules: users can only access their own
create policy "schedules_self" on public.schedules
  for all using (auth.uid() = user_id);

-- Zen Sessions: users can only access their own
create policy "zen_sessions_self" on public.zen_sessions
  for all using (auth.uid() = user_id);

-- ============================================================
--  STORAGE BUCKET for PDFs
--  Run in SQL Editor OR create manually in Storage tab
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdfs',
  'pdfs',
  true,
  52428800,   -- 50 MB per file
  array['application/pdf']
)
on conflict (id) do nothing;

-- Storage policy: authenticated users can upload to their own folder
create policy "pdf_upload_policy" on storage.objects
  for insert with check (
    bucket_id = 'pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: anyone can view (public bucket)
create policy "pdf_view_policy" on storage.objects
  for select using (bucket_id = 'pdfs');

-- Storage policy: users can delete their own files
create policy "pdf_delete_policy" on storage.objects
  for delete using (
    bucket_id = 'pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
--  Auto-create profile on signup trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, streak, last_login, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    0,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
