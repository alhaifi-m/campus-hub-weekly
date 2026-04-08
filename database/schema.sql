-- ─────────────────────────────────────────────────────────────────────────────
-- Campus Hub — Week 13: Supabase Database Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tables:
--   courses        — the course catalog (shared, not per-user)
--   enrollments    — links a user to a course; stores grade + attendance
--   deadlines      — assignments / due dates per course
--   announcements  — per-course announcements
--
-- RLS:
--   All tables require authentication.
--   enrollments: users only see their own rows (user_id = auth.uid())
--   deadlines / announcements: users only see rows for courses they are enrolled in
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. courses ────────────────────────────────────────────────────────────────
-- The shared course catalog. Instructors manage this; students read it.

create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,           -- e.g. "CPRG-303"
  title       text not null,           -- e.g. "Mobile Development"
  instructor  text not null,
  schedule    text not null,           -- e.g. "Tue/Thu 13:00–14:30"
  room        text not null,           -- e.g. "S205"
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- ── 2. enrollments ────────────────────────────────────────────────────────────
-- One row per (user, course) pair.
-- Stores the student's grade and attendance for that course.

create table if not exists enrollments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  course_id           uuid not null references courses on delete cascade,
  grade               text not null default 'In Progress',
  attendance_attended integer not null default 0,
  attendance_total    integer not null default 0,
  created_at          timestamptz not null default now(),
  unique (user_id, course_id)          -- a student can only enroll once per course
);

-- ── 3. deadlines ──────────────────────────────────────────────────────────────
-- Assignments and due dates belonging to a course.
-- Visible to any student enrolled in that course.

create table if not exists deadlines (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses on delete cascade,
  title       text not null,           -- e.g. "Assignment 3"
  due_date    date not null,
  created_at  timestamptz not null default now()
);

-- ── 4. announcements ─────────────────────────────────────────────────────────
-- Announcements posted to a course.
-- Visible to any student enrolled in that course.

create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every table
alter table courses       enable row level security;
alter table enrollments   enable row level security;
alter table deadlines     enable row level security;
alter table announcements enable row level security;


-- courses: any authenticated user can read all courses
create policy "Authenticated users can read courses"
  on courses
  for select
  to authenticated
  using (true);


-- enrollments: users can only read their own enrollment rows
create policy "Users can read own enrollments"
  on enrollments
  for select
  to authenticated
  using (auth.uid() = user_id);


-- deadlines: readable only for courses the user is enrolled in
create policy "Users can read deadlines for enrolled courses"
  on deadlines
  for select
  to authenticated
  using (
    exists (
      select 1
      from enrollments e
      where e.course_id = deadlines.course_id
        and e.user_id = auth.uid()
    )
  );


-- announcements: readable only for courses the user is enrolled in
create policy "Users can read announcements for enrolled courses"
  on announcements
  for select
  to authenticated
  using (
    exists (
      select 1
      from enrollments e
      where e.course_id = announcements.course_id
        and e.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Real-Time
-- Supabase requires explicit publication for real-time to work on a table.
-- Run this after creating the tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow real-time events on enrollments so grade/attendance changes propagate live
alter publication supabase_realtime add table enrollments;
