-- ─────────────────────────────────────────────────────────────────────────────
-- Campus Hub — Week 13: Seed Data
-- Run this in the Supabase SQL Editor AFTER running schema.sql.
--
-- What this seeds:
--   - 3 courses (same ones from the old mock API in lib/api.ts)
--   - 3 deadlines across those courses
--   - 6 announcements across those courses
--
-- What is NOT seeded here:
--   - enrollments — these require real auth.users UUIDs.
--     After signing in to the app, copy your user UUID from
--     Supabase → Authentication → Users, then run the enrollment
--     insert at the bottom of this file with your real UUID.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Courses ──────────────────────────────────────────────────────────────────
-- Fixed UUIDs so enrollments and deadlines can reference them predictably.

insert into courses (id, code, title, instructor, schedule, room, description) values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'CPRG-216',
    'Advanced Web Systems',
    'Prof. Sarah Chen',
    'Mon/Wed 10:00 - 11:30',
    'T310',
    'Covers modern web frameworks, server-side rendering, and progressive web apps. Students build a full-stack web application using current industry tools.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'CPRG-303',
    'Mobile Development',
    'Prof. James Miller',
    'Tue/Thu 13:00 - 14:30',
    'S205',
    'Introduction to cross-platform mobile development with React Native and Expo. Students build a campus utility app from scratch over 8 weeks.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    'CPRG-306',
    'Backend APIs',
    'Prof. Amy Tran',
    'Wed/Fri 09:00 - 10:30',
    'N102',
    'Designing and building RESTful APIs with Node.js and Express. Covers authentication, database integration, and API documentation with OpenAPI.'
  )
on conflict (id) do nothing;


-- ── Deadlines ────────────────────────────────────────────────────────────────
-- Use dates relative to today so they always appear as "upcoming"
-- when the seed is run. Adjust due_date values to real course dates.

insert into deadlines (course_id, title, due_date) values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Assignment 3',
    (current_date + interval '7 days')::date
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Lab 13 — Supabase Integration',
    (current_date + interval '10 days')::date
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Project Milestone 2',
    (current_date + interval '14 days')::date
  );


-- ── Announcements ─────────────────────────────────────────────────────────────

insert into announcements (course_id, body) values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Midterm grades posted — check your portal.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Assignment 3 due date extended by one week.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Guest lecture next Wednesday: Industry panel on web performance.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Week 13 guide is now available on D2L.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Final project proposal due in 2 weeks.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Office hours moved to Thursday 3–4 PM this week.'
  );


-- ── Enrollments ───────────────────────────────────────────────────────────────
-- Replace 'YOUR-USER-UUID-HERE' with your actual UUID from:
-- Supabase → Authentication → Users → copy the UUID column.
--
-- Run this block separately after you have signed up in the app.

/*
insert into enrollments (user_id, course_id, grade, attendance_attended, attendance_total) values
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'B+',
    12,
    14
  ),
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'A-',
    14,
    14
  ),
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'In Progress',
    10,
    14
  );
*/


-- ── Mohammed Al-Haifi — ready to run ─────────────────────────────────────────
-- 1. Go to Supabase → Authentication → Users
-- 2. Copy your UUID from the User ID column
-- 3. Paste it below replacing YOUR-USER-UUID-HERE
-- 4. Run this block in SQL Editor

insert into enrollments (user_id, course_id, grade, attendance_attended, attendance_total) values
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'B+',
    12,
    14
  ),
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'A-',
    14,
    14
  ),
  (
    'YOUR-USER-UUID-HERE',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'In Progress',
    10,
    14
  )
on conflict (user_id, course_id) do nothing;
