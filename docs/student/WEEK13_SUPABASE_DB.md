# Week 13: Supabase Database + Sync

## Real Courses, Real Grades, Real Time — Your Data Lives in the Cloud

---

## Table of Contents

1. [Before vs After](#before-vs-after)
2. [Architecture Impact](#architecture-impact)
3. [New Concepts](#new-concepts)
   - [1. Relational Databases — Tables, Rows, and Foreign Keys](#concept-1)
   - [2. Row Level Security (RLS)](#concept-2)
   - [3. Supabase Query Patterns](#concept-3)
   - [4. Real-Time Subscriptions](#concept-4)
   - [5. Optimistic Updates](#concept-5)
   - [6. The Database Layer Pattern](#concept-6)
4. [Step-by-Step Implementation](#step-by-step)
5. [Common Mistakes](#common-mistakes)
6. [Student Challenge](#student-challenge)

---

## Before vs After <a name="before-vs-after"></a>

### Before (Week 12)

```
lib/api.ts — the source of all data
├── const COURSES = [ ... ]          ← a hardcoded JavaScript array
├── const COURSE_DETAILS = { ... }   ← a hardcoded JavaScript object
└── const DASHBOARD = { ... }        ← hardcoded attendance and deadline

App behavior:
├── Every user sees the same courses
├── "Grade: B+" is hardcoded — it's your grade AND your classmate's grade
├── Attendance is always 36/42 (86%) — no matter who is signed in
└── Closing and reopening the app shows the exact same fake data
```

### After (Week 13)

```
Supabase Postgres — the source of all data
├── courses table        ← shared course catalog (same for everyone)
├── enrollments table    ← YOUR grade and attendance (different per student)
├── deadlines table      ← upcoming assignments for your courses
└── announcements table  ← messages posted to your courses

App behavior:
├── Courses tab shows only YOUR enrolled courses
├── Grade "B+" is YOUR grade — your classmate's grade is their own row
├── Attendance is the real number from the database
├── Changing a value in Supabase → the app updates automatically (real-time)
└── The hardcoded era is over
```

---

## Architecture Impact <a name="architecture-impact"></a>

### New Files

```
database/
├── schema.sql       ← Run once in Supabase SQL Editor — creates the tables + security
└── seed.sql         ← Sample data to test with (courses, deadlines, announcements)

lib/
└── db.ts            ← All Supabase database queries (replaces mock functions in api.ts)
```

### Modified Files

```
app/(tab)/
├── home.tsx               ← MODIFIED: live attendance + deadline from Supabase
└── courses/
    ├── index.tsx          ← MODIFIED: your enrolled courses + real-time grade updates
    └── [id].tsx           ← MODIFIED: real grade, attendance %, deadlines, announcements
```

### What Didn't Change

```
lib/api.ts           ← still in the repo (for reference), but screens no longer call it
lib/supabase.ts      ← same Supabase client from Week 12, unchanged
context/AuthContext  ← same auth context, unchanged
```

### The Data Flow — Before and After

```
BEFORE (Week 10–12):
─────────────────────────────────────────────────────────────────────
 Screen → api.ts → in-memory JavaScript array → setCourses(data)

AFTER (Week 13):
─────────────────────────────────────────────────────────────────────
 Screen → db.ts → Supabase JS client → Postgres query → Row data
          ↑                                                   ↓
          └───────────── setCourses(data) ────────────────────┘

 Real-time update path:
 Database changes → WebSocket message → callback → re-fetch → re-render
```

---

## New Concepts <a name="new-concepts"></a>

---

### Concept 1: Relational Databases — Tables, Rows, and Foreign Keys <a name="concept-1"></a>

#### What is a relational database?

A relational database organizes data into **tables** — think of each table as a spreadsheet where:
- Every **column** has a name and a type (`text`, `integer`, `uuid`, `timestamptz`, etc.)
- Every **row** is one record (one course, one enrollment, one deadline)
- Tables can **reference each other** through foreign keys

Supabase runs **Postgres** — one of the most widely used relational databases in the world. Every query you write, every row you insert, every join you do — it is all real SQL running on a real Postgres database.

---

#### Why do we need four tables instead of one?

The instinct when starting out is to put everything in one table:

```
❌ One giant table (wrong):

| user_id | course_code | grade | deadline_title | announcement |
| UUID-A  | CPRG-303   | B+    | Assignment 3   | No class Fri |
| UUID-A  | CPRG-216   | A-    | Quiz 2         | Lab moved    |
| UUID-B  | CPRG-303   | C+    | Assignment 3   | No class Fri |
```

**The problem:** Every time there's a new announcement for CPRG-303, you'd have to
duplicate a row for every student enrolled. Change the announcement text? Update
every single row. This is called **data duplication** — and it leads to inconsistency
the moment someone updates one row but not another.

Relational databases solve this with **normalization**: each piece of information is
stored exactly once, in the right table, and other tables *reference* it through keys.

---

#### The courses table — shared catalog

```
courses
┌─────────────────────────────────────────────────────┐
│ id (uuid) PK  │ code      │ title        │ instructor │
├───────────────┼───────────┼──────────────┼───────────┤
│ aaaa-0001     │ CPRG-216  │ Database Dev │ J. Smith  │
│ aaaa-0002     │ CPRG-303  │ Mobile Dev   │ A. Jones  │
│ aaaa-0003     │ CPRG-306  │ Web Dev      │ B. Patel  │
└─────────────────────────────────────────────────────┘
```

One row per course. The course itself does not know anything about students or grades.
It is a shared catalog — every student in the school sees the same three rows.

---

#### The enrollments table — where grade and attendance live

Here is the critical design question: **where does the grade go?**

The wrong instinct: add a `grade` column to the `courses` table.

```
❌ Wrong design — grade on courses:

courses
┌───────────┬──────────────┬────────┐
│ code      │ title        │ grade  │
├───────────┼──────────────┼────────┤
│ CPRG-303  │ Mobile Dev   │  ???   │ ← whose grade?
└───────────┴──────────────┴────────┘

Problem: 30 students take CPRG-303. They all share this one row.
There is only ONE grade column. It can hold ONE value.
Updating Student A's grade overwrites Student B's.
You cannot store 30 different grades in one cell.
```

The fix: move grade (and attendance) to a separate `enrollments` table.

```
✅ Correct design — grade on enrollments:

enrollments
┌──────────┬───────────┬────────┬──────────────────┬──────────────────┐
│ user_id  │ course_id │ grade  │ attendance_attend │ attendance_total  │
├──────────┼───────────┼────────┼──────────────────┼──────────────────┤
│ UUID-A   │ aaaa-0002 │  B+    │        18         │        20        │ ← Student A
│ UUID-B   │ aaaa-0002 │  A-    │        20         │        20        │ ← Student B
│ UUID-C   │ aaaa-0002 │  C+    │        14         │        20        │ ← Student C
└──────────┴───────────┴────────┴──────────────────┴──────────────────┘

Each student has their own row. Updating Student A's grade touches only UUID-A's row.
UUID-B and UUID-C are completely untouched.
```

**Each row in enrollments answers the question:** "This person (user_id) is in this
course (course_id), has this grade, and attended this many classes."

---

#### The real-world analogy

Think of a **report card**. The school (`courses`) exists. The student (`auth.users`) exists.
The report card (`enrollments`) is the document that connects them and holds the grade.
You do not write the grade on the student record. You do not write it on the course catalog.
You write it on the report card — and every student has their own report card for each course.

---

#### What is a foreign key?

A **foreign key** is a column in one table that points to a row in another table.

```
enrollments.user_id   → references auth.users.id
enrollments.course_id → references courses.id
```

When a column is declared as a foreign key, the database **enforces the reference**:
- You cannot insert an enrollment for a `user_id` that does not exist in `auth.users`
- You cannot insert an enrollment for a `course_id` that does not exist in `courses`
- If a course is deleted, all its enrollments are automatically deleted too (cascade delete)

The database makes illegal data structurally impossible — not just something you hope your app prevents.

---

#### The unique constraint

```sql
unique (user_id, course_id)
```

This tells Postgres: the combination of `user_id` and `course_id` must be unique.
A student can only be enrolled in the same course once.

Without this, it would be possible to accidentally insert two enrollment rows for the
same student in the same course — and your app would see two grade cards for one course.
The constraint makes it impossible at the database level. Your app never needs to check.

---

#### One-to-many relationship

The relationship between `courses` and `enrollments` is **one-to-many**:
- One course row maps to **many** enrollment rows (one per student)
- Each enrollment row maps to **one** course row

```
courses          enrollments
┌──────────┐     ┌──────────────────────┐
│ CPRG-303 │──┬─►│ UUID-A │ CPRG-303 │ B+ │
└──────────┘  ├─►│ UUID-B │ CPRG-303 │ A- │
              └─►│ UUID-C │ CPRG-303 │ C+ │
                 └──────────────────────┘
```

`enrollments` is called a **join table** (also called a pivot table or bridge table).
It models the relationship between students and courses, and it carries the
per-student data (grade, attendance) that belongs to that relationship.

---

### Concept 2: Row Level Security (RLS) <a name="concept-2"></a>

#### The problem without RLS

When you query a Supabase table without RLS, you get back **all rows for all users**:

```sql
-- Without RLS:
SELECT * FROM enrollments;
-- Returns 300 rows — every student's grade, every student's attendance.
-- If there's a bug in your app that passes the wrong user ID,
-- you could accidentally display another student's grade.
```

You might think: "I'll just filter in my app code." But app code can have bugs. A developer
could accidentally forget the `.eq("user_id", userId)` filter. A direct HTTP request to
Supabase could bypass your app entirely. You are trusting every line of code to be correct,
every time.

RLS removes that trust requirement entirely.

---

#### What RLS does

RLS (Row Level Security) moves the filter **into the database itself**. Before any row leaves
Postgres, the database evaluates a **policy** for that row. If the policy returns false,
the row is invisible — it is never returned, never transmitted, never seen.

```
Without RLS:                        With RLS (our policy):
────────────────────────────────    ────────────────────────────────
App: SELECT * FROM enrollments      App: SELECT * FROM enrollments
DB:  returns ALL 300 rows           DB:  evaluates auth.uid() = user_id
                                         for every row
                                    DB:  returns only YOUR rows
```

Even if the app sends a "wrong" query, even if a developer forgets to filter,
even if someone sends a raw HTTP request — the database filters it. The app
cannot override RLS. No code path bypasses it.

---

#### auth.uid() — the key function

`auth.uid()` is a Supabase Postgres function that returns the UUID of the currently
signed-in user — extracted from the JWT token that Supabase issued when they logged in.

```
You sign in with email + password
       ↓
Supabase creates a JWT (JSON Web Token)
The JWT contains your UUID, signed with Supabase's secret key
       ↓
Every time your app makes a database request,
the JWT is sent in the request headers
       ↓
Supabase reads the JWT, verifies the signature,
and makes auth.uid() available inside Postgres
       ↓
The database evaluates auth.uid() = user_id for every row
```

This is why RLS works even for direct HTTP requests. The JWT travels with every request.
A forged JWT fails signature verification before it ever reaches the database.

---

#### Our four policies — explained individually

**Policy 1: courses — `using (true)`**

```sql
create policy "Anyone can read courses"
  on courses for select to authenticated
  using (true);
```

`using (true)` means: always return this row. Any signed-in user can read any course row.

**Why?** The course catalog is public within the app. CPRG-303 exists for all students.
There is no private data in the `courses` table — no grades, no attendance, nothing personal.

---

**Policy 2: enrollments — `using (auth.uid() = user_id)`**

```sql
create policy "Users can read own enrollments"
  on enrollments for select to authenticated
  using (auth.uid() = user_id);
```

For every enrollment row, the database evaluates: "Does the UUID in this row's `user_id`
column match the UUID of the person making the request?"

```
enrollment row: user_id = UUID-A, grade = B+
requesting user: UUID-A
auth.uid() = UUID-A
auth.uid() = user_id? → true → row returned ✓

enrollment row: user_id = UUID-B, grade = C+
requesting user: UUID-A
auth.uid() = UUID-A
auth.uid() = user_id? → false → row invisible ✗
```

Student A's grade is completely invisible to Student B. Not hidden by the app — literally
not returned by the database. Student B cannot see it even with a direct SQL query.

---

**Policy 3: deadlines — the subquery**

```sql
create policy "Enrolled users can read deadlines"
  on deadlines for select to authenticated
  using (
    exists (
      select 1 from enrollments
      where course_id = deadlines.course_id
      and user_id = auth.uid()
    )
  );
```

Deadlines do **not** have a `user_id` column. They belong to a course, not a student.
So we cannot do a simple `auth.uid() = user_id` check.

Instead, the database asks a different question for every deadline row:
**"Is there an enrollment row where this user is in the course this deadline belongs to?"**

```
deadline row: course_id = aaaa-0002 (CPRG-303), title = "Assignment 3"
requesting user: UUID-A

Subquery: SELECT 1 FROM enrollments
          WHERE course_id = aaaa-0002
          AND user_id = UUID-A

→ Found a row (UUID-A is enrolled in CPRG-303)
→ exists() = true → deadline returned ✓

requesting user: UUID-X (not enrolled in CPRG-303)
→ No row found
→ exists() = false → deadline invisible ✗
```

The privacy comes not from the deadline's own data but from checking the enrollment.

---

**Policy 4: announcements — same subquery as deadlines**

Announcements also belong to a course with no `user_id`. The same subquery pattern applies:
a student can only see announcements for courses they are enrolled in.

---

#### The mental model

Think of RLS as a **bouncer standing at every table in the database**. Before any row leaves,
the bouncer checks the policy. There is no side door. There is no "admin override" from the
app layer. Even if a developer writes buggy code that queries the wrong data, the bouncer
stops it at the table level. The policy always runs, for every row, for every request.

---

### Concept 3: Supabase Query Patterns <a name="concept-3"></a>

The Supabase JavaScript client gives you a chainable API that translates to SQL.
Understanding the translation makes the code much easier to read and debug.

---

#### `.from()` — which table

```ts
supabase.from("enrollments")
// SQL: FROM enrollments
```

This is the table you are querying. Everything else in the chain adds to this query.

---

#### `.select()` — which columns

```ts
.select("id, grade, attendance_attended, attendance_total")
// SQL: SELECT id, grade, attendance_attended, attendance_total
//      FROM enrollments
```

Only ask for the columns you need. Selecting only the required columns reduces
the amount of data sent over the network.

---

#### Nested select — the JOIN

```ts
.select(`
  id,
  grade,
  attendance_attended,
  attendance_total,
  courses (
    id,
    code,
    title,
    instructor,
    schedule,
    room,
    description
  )
`)
```

The `courses ( ... )` inside the select string tells Supabase: **JOIN the courses table**.
Supabase sees that `enrollments.course_id` is a foreign key pointing to `courses.id`
and automatically performs the JOIN.

The result shape has the enrollment columns at the root level, with course columns
nested inside a `courses` object:

```ts
// What Supabase returns:
{
  id: "enrollment-uuid",
  grade: "B+",
  attendance_attended: 18,
  attendance_total: 20,
  courses: {
    id: "course-uuid",
    code: "CPRG-303",
    title: "Mobile Development",
    instructor: "A. Jones",
    schedule: "Mon/Wed 9–11am",
    room: "Room 214",
    description: "..."
  }
}
```

The `.map()` in `getEnrolledCourses` **flattens** this — spreading `row.courses` into
the returned object so screens can access `item.code` directly instead of `item.courses.code`.

---

#### `.eq()` — WHERE column = value

```ts
.eq("user_id", userId)
// SQL: WHERE user_id = 'the-user-uuid'
```

Filters rows. Only rows where `user_id` equals `userId` are returned.
Even though RLS already enforces this, the `.eq()` filter is still included —
belt-and-suspenders. It makes the intent explicit in the code.

---

#### `.in()` — WHERE column IN (a, b, c)

```ts
.in("course_id", courseIds)
// SQL: WHERE course_id IN ('uuid-1', 'uuid-2', 'uuid-3')
```

Used in `getDashboardData` to filter deadlines to only the courses the user is
enrolled in. You cannot use `.eq()` here because there are multiple course IDs —
`.in()` matches any value in the array.

---

#### `.gte()` — WHERE column >= value

```ts
.gte("due_date", today)
// SQL: WHERE due_date >= '2026-04-07'
```

"Greater than or equal to." Used to filter deadlines to only future ones.
Without this filter, `.order("due_date").limit(1)` would return the oldest
deadline — including ones from months ago.

---

#### `.order()` — ORDER BY

```ts
.order("created_at")           // ORDER BY created_at ASC (oldest first)
.order("due_date")             // ORDER BY due_date ASC (soonest first)
.order("created_at", { ascending: false })  // ORDER BY created_at DESC (newest first)
```

---

#### `.limit()` — LIMIT n

```ts
.limit(1)
// SQL: LIMIT 1
```

Only return the first row. Used in `getDashboardData` after ordering by `due_date`
ascending — so limit(1) gives the soonest upcoming deadline.

---

#### `.single()` vs `.maybeSingle()`

```ts
.single()
// Expects EXACTLY ONE row.
// If zero rows → throws PGRST116 error.
// If more than one row → throws an error.
// Use when you are certain the row exists.

.maybeSingle()
// Expects ZERO OR ONE row.
// If zero rows → returns null (not an error).
// If more than one row → throws an error.
// Use when the row might not exist.
```

When to use which:

```ts
// .single() — you know the enrollment must exist (you're on the course detail screen,
// which you can only reach if you're enrolled in that course)
.eq("course_id", courseId)
.eq("user_id", userId)
.single()

// .maybeSingle() — there might be no upcoming deadline (user is all caught up)
.gte("due_date", today)
.order("due_date")
.limit(1)
.maybeSingle()
```

---

#### Error handling — always check

Every Supabase query returns `{ data, error }`. Always check the error before using data:

```ts
const { data, error } = await supabase.from("enrollments").select("...");
if (error) throw error;
// Now data is safe to use
```

If you skip the error check and `data` is null (because the query failed), your app
will crash trying to `.map()` over null.

---

### Concept 4: Real-Time Subscriptions <a name="concept-4"></a>

#### The problem with polling

The naive approach to "keep the UI up to date" is polling — checking the server on a timer:

```ts
// ❌ Polling — wasteful and slow
useEffect(() => {
  const interval = setInterval(() => {
    loadCourses(); // ask the server every 5 seconds
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**Why polling is bad:**
- Makes a network request every 5 seconds — even when nothing changed
- Drains the user's battery
- Adds load to the database for zero benefit most of the time
- You still have up to 5 seconds of lag after a change

---

#### HTTP vs WebSocket — the fundamental difference

Regular HTTP requests are **one-way and short-lived**:

```
App ──→ "GET /courses" ──→ Supabase
App ←── "Here are your courses" ←── Supabase
Connection closes. That is the end of it.
```

To get updates, the app must ask again. The server cannot initiate contact.

**WebSockets** are **two-way and persistent**:

```
App ──→ "I want to connect and watch enrollments for UUID-X" ──→ Supabase
Connection stays open (like a phone call that stays on hold)
(minutes later, instructor changes a grade in Supabase)
App ←── "Row changed: UUID-X's grade in CPRG-303 is now A-" ←── Supabase
(connection still open, waiting for the next change)
```

The server can push a message to the app **the instant** something changes. No waiting.
No polling. Near-zero cost when nothing is happening.

---

#### How Supabase Realtime works

Postgres has a feature called **logical replication** that streams every INSERT, UPDATE,
and DELETE as an event. Supabase's Realtime service listens to this stream and forwards
relevant events to connected clients over WebSockets.

When you run `alter publication supabase_realtime add table enrollments` in schema.sql,
you are telling Postgres: "include enrollment changes in the replication stream."

---

#### The subscription code — line by line

```ts
const channel = supabase
  // .channel() — create a named WebSocket connection
  // The name is just a label so you can identify it later
  .channel("enrollments-courses-list")

  // .on() — declare what events to listen to
  .on(
    "postgres_changes",   // event type: changes to Postgres rows

    {
      event: "*",                        // * = INSERT, UPDATE, or DELETE
      schema: "public",                  // the Postgres schema
      table: "enrollments",              // watch this specific table
      filter: `user_id=eq.${user!.id}`, // only MY rows, not all students'
    },

    () => {
      // This callback fires when a change is detected.
      // We re-fetch the full list instead of trying to merge the diff.
      // Re-fetching is simpler and more reliable for small data sets.
      loadCoursesRef.current?.();
    }
  )

  // .subscribe() — open the WebSocket connection.
  // Nothing above this line sends any network request.
  // This is the line that actually connects.
  .subscribe();
```

---

#### The cleanup — why it matters

```ts
// This runs when the component unmounts (user navigates away from the tab)
return () => {
  supabase.removeChannel(channel);
};
```

Without cleanup:
- The WebSocket stays open after the screen unmounts
- If a grade changes, the callback fires and calls `loadCoursesRef.current?.()`
- That function calls `setCourses(...)` on a component that no longer exists
- React logs a warning. In some cases, the app crashes.
- Battery and bandwidth are wasted for a subscription nobody is using.

With cleanup: the moment the user navigates away, the WebSocket closes cleanly.

---

#### The useRef pattern — solving the stale closure problem

When you put a function inside a `useEffect` with empty deps `[]`, that `useEffect`
runs **once** — after the first render. The callback it sets up captures a snapshot of
everything in scope at that moment.

```ts
// ❌ Stale closure — the problem
const loadCourses = async () => {
  // ... uses `courses`, `setError`, etc. from the first render
};

useEffect(() => {
  const channel = supabase.channel(...)
    .on("postgres_changes", { ... }, () => {
      loadCourses(); // ← This is the loadCourses from the FIRST render.
                    //   It never updates. It has stale state.
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []); // ← empty deps: effect never re-runs
```

Every time React re-renders the component, it creates a new version of `loadCourses`.
But the subscription callback still points to the old one from render 1.

The fix: a **ref**. A ref is a mutable container that persists across renders. Updating
the ref does not cause a re-render, but the latest value is always available.

```ts
// ✅ useRef — the fix
const loadCoursesRef = useRef<(() => Promise<void>) | undefined>(undefined);

// This useEffect runs on EVERY render (no deps array).
// It updates the ref to always point to the current loadCourses.
useEffect(() => {
  loadCoursesRef.current = loadCourses;
});

// This useEffect runs ONCE (empty deps).
// The callback calls loadCoursesRef.current — always the latest version.
useEffect(() => {
  const channel = supabase.channel(...)
    .on("postgres_changes", { ... }, () => {
      loadCoursesRef.current?.(); // ← always calls the LATEST loadCourses
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

**Why `?.` (optional chaining)?** The ref starts as `undefined` before the first render.
The `?.` means: "only call it if it's not undefined." By the time any database event
fires, the ref will always be set — but TypeScript doesn't know that, and this guards
against any edge case where the event fires before the first render cycle completes.

---

### Concept 5: Optimistic Updates <a name="concept-5"></a>

#### What "optimistic" means in UI

An **optimistic update** is when the UI changes immediately — based on the assumption that
the operation will succeed — rather than waiting for confirmation from the server.

In Week 13, this appears in **pull-to-refresh** behavior.

---

#### The pessimistic pattern (what we did before)

```ts
// ❌ Pessimistic — clears data before fetching
const handleRefresh = async () => {
  setCourses([]);        // ← blank screen immediately
  setIsLoading(true);
  const result = await db.getEnrolledCourses(user!.id);
  setCourses(result);
  setIsLoading(false);
};
```

What the user sees:
```
Courses are visible → user pulls down → BLANK SCREEN → courses reappear
```

The blank screen lasts for the duration of the network request — typically 200–800ms.
The user is punished with a flash of emptiness every time they refresh.

---

#### The optimistic pattern (what we do now)

```ts
// ✅ Optimistic — keeps existing data visible while fetching fresh data
const handleRefresh = async () => {
  setRefreshing(true);  // ← shows the pull-to-refresh spinner at the top
                        //   but does NOT clear the existing courses
  const result = await db.getEnrolledCourses(user!.id);
  setCourses(result);   // ← silently replaces with fresh data
  setRefreshing(false);
};
```

What the user sees:
```
Courses are visible → user pulls down → courses STAY visible (spinner at top) → data updates silently
```

The user never sees a blank screen. The existing data is shown optimistically
while fresh data loads. If the fetch fails, we show an error — but the old data
remains visible as context. This is called **stale-while-revalidate**.

---

#### Why not always optimistic?

The initial load (first time the screen opens) cannot be optimistic — there is no
existing data to show. That is why `loadCourses` (called on mount) shows a full
`ActivityIndicator`:

```ts
const loadCourses = async () => {
  setIsLoading(true);  // ← full screen spinner — no data yet
  const result = await db.getEnrolledCourses(user!.id);
  setCourses(result);
  setIsLoading(false);
};
```

The two functions serve different purposes:
- `loadCourses` — first load, no existing data, show full spinner
- `handleRefresh` — user-triggered refresh, existing data visible, show pull indicator only

---

### Concept 6: The Database Layer Pattern <a name="concept-6"></a>

#### What is a layer?

A **layer** is a section of your codebase that is responsible for one specific job,
with a clean boundary between it and everything else.

In Week 10, `lib/api.ts` was the **data layer** — it was the only place that knew
where data came from (JavaScript arrays). Screens called `api.getCourses()` and got
data back. They did not know or care that it was hardcoded.

In Week 13, `lib/db.ts` is the new **database layer** — it is the only place that knows
about Supabase, queries, JOINs, and type casting. Screens call `db.getEnrolledCourses(user.id)`
and get data back. They do not know or care about Supabase specifics.

---

#### The parallel

```
Week 10 (mock layer):          Week 13 (database layer):
────────────────────────────   ────────────────────────────
lib/api.ts                     lib/db.ts
  getCourses()          →        getEnrolledCourses(userId)
  getCourseById(id)     →        getCourseDetail(courseId, userId)
  getDashboard()        →        getDashboardData(userId)

Screens call:                  Screens call:
  api.getCourses()      →        db.getEnrolledCourses(user!.id)
  api.getCourseById(id) →        db.getCourseDetail(id!, user!.id)
  api.getDashboard()    →        db.getDashboardData(user!.id)
```

The screens barely change. Swap `api` for `db`, add `user!.id` as a parameter,
handle the nullable `nextDeadline` case. The structure is the same.

---

#### Why this matters — separation of concerns

If Supabase changes its API in a future version, or if you decide to switch to a
different database, you only change `lib/db.ts`. The screens stay exactly the same.

If a screen needs to show courses differently, you change the screen. The database
query stays the same.

Each piece of the codebase has one job and one reason to change. This is
**separation of concerns** — one of the core principles of maintainable software.

---

## Step-by-Step Implementation <a name="step-by-step"></a>

### Step 1 — Create the Tables in Supabase

In your Supabase project: **SQL Editor → New query**.

Copy the contents of `database/schema.sql` from the repo and run it. This creates 4 tables:

| Table | Purpose |
|-------|---------|
| `courses` | Shared course catalog — the same for all students |
| `enrollments` | Your enrollment in a course — grade, attendance |
| `deadlines` | Assignments and due dates per course |
| `announcements` | Announcements per course |

After running, open **Table Editor** and verify all 4 tables exist. Each should show
an "RLS enabled" badge — that badge means RLS is active on the table.

### Step 2 — Verify RLS is Active

RLS is included in `schema.sql` — it runs automatically when you paste and run the file.

To confirm: **Table Editor → click any table → look for the "RLS enabled" badge** near
the top. If you see it, the policies are active.

You can also verify by clicking **Authentication → Policies** in the Supabase sidebar —
you will see each policy listed under its table name.

### Step 3 — Seed Sample Data

Still in SQL Editor, run `database/seed.sql`. This inserts:
- 3 courses (CPRG-216, CPRG-303, CPRG-306) with fixed UUIDs
- 3 deadlines (one per course, due 7–14 days from when seed.sql is run)
- 6 announcements (two per course)

**Then add your enrollment.** The seed file has a commented-out block at the bottom.
To activate it:

1. Go to **Authentication → Users** in Supabase
2. Copy your UUID (the long string in the User ID column)
3. In the seed file, replace `'YOUR-USER-UUID-HERE'` with your UUID
4. Remove the `/*` and `*/` comment markers around that block
5. Run just that block in SQL Editor

After running: **Table Editor → enrollments** should show 3 rows — one per course,
all with your UUID in `user_id`.

### Step 4 — Create `lib/db.ts`

Create a new file `lib/db.ts` next to `supabase.ts`. This file exports 3 functions
(`getEnrolledCourses`, `getCourseDetail`, `getDashboardData`) and 3 types
(`EnrolledCourse`, `CourseDetail`, `DashboardData`).

The full file is in the repo. Walk through it with the comments — every `.from()`,
`.select()`, `.eq()`, `.order()` has an explanation of what SQL it maps to.

Key implementation decisions:
- All Supabase-specific code lives here — screens never import `supabase` directly
- `getCourseDetail` makes three separate queries instead of one complex JOIN — easier to read and teach
- `getDashboardData` uses `.in()` with the course IDs from query 1 — must run sequentially
- All joins use `as unknown as T` to cast types — Supabase infers FK joins as arrays at compile time

### Step 5 — Update `app/(tab)/courses/index.tsx`

Key changes from the Week 10 version:

1. `import { useAuth }` — to get `user.id` for the query
2. `import * as db from "../../../lib/db"` — the new data source
3. `const { user } = useAuth()` — inside the component
4. `loadCourses` calls `db.getEnrolledCourses(user!.id)` instead of `api.getCourses()`
5. `handleRefresh` does NOT call `setCourses([])` before fetching — optimistic pattern
6. `const loadCoursesRef = useRef<(() => Promise<void>) | undefined>(undefined)` — for the subscription
7. First `useEffect` (no deps array) — updates `loadCoursesRef.current` on every render
8. Second `useEffect` (empty deps `[]`) — sets up the real-time subscription on mount

### Step 6 — Update `app/(tab)/courses/[id].tsx`

Key changes:

1. Import `useAuth` and `db`
2. Add `const { user } = useAuth()` inside the component
3. `loadCourse` calls `db.getCourseDetail(id!, user!.id)` — two params now (course ID + user ID)
4. Calculate attendance percentage from raw numbers:
   ```ts
   const attendancePct = course!.attendanceTotal > 0
     ? Math.round((course!.attendanceAttended / course!.attendanceTotal) * 100)
     : 0;
   ```
5. Render `course.deadlines` as a list (array of objects, not a string)
6. Render `course.announcements` using `a.body` (objects, not strings)
7. Add empty states for both deadlines and announcements

### Step 7 — Update `app/(tab)/home.tsx`

Key changes:

1. Import `db` instead of `api`
2. `loadDashboard` calls `db.getDashboardData(user!.id)`
3. Handle the nullable `nextDeadline`:
   ```tsx
   {data?.nextDeadline ? (
     <AppCard title="Upcoming Deadline" subtitle={`${data.nextDeadline.course} — ${data.nextDeadline.title} due ${data.nextDeadline.dueDate}`} />
   ) : (
     <AppCard title="Upcoming Deadline" subtitle="No upcoming deadlines" />
   )}
   ```

---

## Common Mistakes <a name="common-mistakes"></a>

### 1. Forgetting to add enrollments for your user

```
Symptom: Courses tab shows empty list, no error message, no spinner
Cause:   The courses table has data, but enrollments has no rows for your UUID
Fix:     Run the enrollment insert from seed.sql with your real UUID
         (Authentication → Users → copy your User ID)
```

**Why it shows empty and not an error:** The RLS policy on `enrollments` filters to rows
where `user_id = auth.uid()`. If there are no rows with your UUID, the query returns
an empty array — which is not an error. An empty array is valid data. The app
correctly renders the empty state ("No courses yet. Ask your instructor to enroll you.").

---

### 2. Calling `.single()` when the row might not exist

```ts
// ❌ Wrong — throws PGRST116 error if no upcoming deadline exists
.gte("due_date", today)
.order("due_date")
.limit(1)
.single()          // ← explodes if zero rows

// ✅ Correct — returns null gracefully
.gte("due_date", today)
.order("due_date")
.limit(1)
.maybeSingle()     // ← returns null if zero rows, no error
```

Use `.single()` when you know a row must exist (your enrollment in a course you
are currently viewing). Use `.maybeSingle()` when absence is a valid state
(the next deadline — there might simply be none).

---

### 3. Not cleaning up the real-time subscription

```ts
// ❌ Wrong — memory leak
useEffect(() => {
  const channel = supabase.channel("...").on(...).subscribe();
  // missing return statement
}, []);

// ✅ Correct — cleanup on unmount
useEffect(() => {
  const channel = supabase.channel("...").on(...).subscribe();
  return () => supabase.removeChannel(channel); // ← this runs when component unmounts
}, []);
```

Without the cleanup, navigating away from the Courses tab leaves a WebSocket
subscription running in the background. When it fires, it tries to update state
on a component that no longer exists. React logs a warning; in some versions it crashes.

---

### 4. The stale closure trap — calling loadCourses directly in the subscription

```ts
// ❌ Wrong — stale closure captures old loadCourses from first render
useEffect(() => {
  const channel = supabase.channel(...)
    .on("postgres_changes", { ... }, () => {
      loadCourses(); // ← this is the version from render 1, frozen in time
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

```ts
// ✅ Correct — ref always points to the latest version
const loadCoursesRef = useRef<(() => Promise<void>) | undefined>(undefined);

useEffect(() => {
  loadCoursesRef.current = loadCourses; // runs on every render, keeps ref fresh
});

useEffect(() => {
  const channel = supabase.channel(...)
    .on("postgres_changes", { ... }, () => {
      loadCoursesRef.current?.(); // ← always the latest loadCourses
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

---

### 5. Division by zero in attendance percentage

```ts
// ❌ Wrong — NaN if attendanceTotal is 0 (new course with no classes yet)
const pct = Math.round((attendanceAttended / attendanceTotal) * 100);
// → Math.round((0 / 0) * 100) → Math.round(NaN) → NaN
// React Native renders NaN as nothing — the percentage just disappears

// ✅ Correct — guard against zero total
const pct = attendanceTotal > 0
  ? Math.round((attendanceAttended / attendanceTotal) * 100)
  : 0;
```

A brand new course that just started may have `attendance_total = 0` before any
classes have taken place. Dividing by zero gives `NaN` in JavaScript — guard against it.

---

### 6. Not handling the null nextDeadline

```tsx
// ❌ Wrong — crashes when nextDeadline is null
<AppCard subtitle={`${data.nextDeadline.course} — ...`} />
// TypeError: Cannot read property 'course' of null

// ✅ Correct — conditional render
{data?.nextDeadline ? (
  <AppCard subtitle={`${data.nextDeadline.course} — ${data.nextDeadline.title}`} />
) : (
  <AppCard subtitle="No upcoming deadlines" />
)}
```

`getDashboardData` returns `nextDeadline: null` when there are no deadlines with
`due_date >= today`. The mock API always returned a hardcoded deadline. Real data does not.

---

### 7. Using the wrong ID in the courses route

```ts
// ❌ Wrong — passing the course code string
router.push(`/(tab)/courses/${item.code}`);
// Pushes "/(tab)/courses/CPRG-303"
// getCourseDetail queries by UUID — "CPRG-303" is not a UUID, the query fails

// ✅ Correct — passing the Supabase UUID
router.push(`/(tab)/courses/${item.id}`);
// Pushes "/(tab)/courses/aaaa-0000-0000-0000-000000000002"
// getCourseDetail queries: WHERE course_id = 'aaaa-...' — this matches
```

In Week 10 the route param was a slug (`"cprg216"`). In Week 13 it is a UUID.
`getCourseDetail` runs `.eq("course_id", courseId)` — it needs the UUID.

---

## Student Challenge <a name="student-challenge"></a>

### Part 1 — Set Up Your Own Database (Required)

Follow the steps from class:

1. Run `database/schema.sql` in Supabase SQL Editor
2. Run `database/seed.sql` (courses + deadlines + announcements sections)
3. Find your user UUID in Authentication → Users
4. Run the enrollment insert with your UUID
5. Verify: Courses tab shows 3 courses with your grades, Home shows your next deadline

### Part 2 — Extend the Data (Required)

Using Supabase Table Editor or SQL Editor:

1. Add a 4th course to the `courses` table (any course code and title you like)
2. Add an enrollment row for yourself in that course (with a grade and attendance numbers)
3. Add at least one deadline and one announcement for the new course
4. Verify the new course appears in the app without any code changes

**Why no code changes are needed:** The app queries all courses you are enrolled in —
it does not have a hardcoded list. Adding a row to `enrollments` is enough.

### Part 3 — Real-Time on Course Detail (Bonus)

The courses *list* has a real-time subscription. The course *detail* screen does not —
it requires a manual pull-to-refresh to see grade updates.

Add a real-time subscription to `app/(tab)/courses/[id].tsx` that re-fetches the course
when its enrollment row changes (for example, when an instructor updates the grade).

**The pattern is identical to `courses/index.tsx`.** You will need:
- A `useRef` for the `loadCourse` callback
- A second `useEffect` for the subscription, filtered to `course_id=eq.${id}`
- A cleanup `return () => supabase.removeChannel(channel)`

Test it: Open the course detail screen → change the grade in Supabase Table Editor
→ watch the grade update on screen with no tap or pull needed.

### Part 4 — Real-Time Home Dashboard (Double Bonus)

Add a real-time subscription to `app/(tab)/home.tsx` that re-fetches the dashboard
when any of the user's enrollments change.

The subscription should watch the `enrollments` table with `filter: user_id=eq.${user!.id}` —
the same filter as the courses list subscription.

**Think about this:** `getDashboardData` also depends on the `deadlines` table.
If an instructor adds a new deadline, the home screen will not update because the
subscription only watches `enrollments`. How would you handle that? A second subscription
on `deadlines`? Would that add too much complexity? There is no single right answer —
think through the tradeoffs.

---

*Week 13 is the turning point. The app now has a real backend, real per-user data, and live updates. Everything built in Weeks 7–12 was preparation for this: routing to navigate, forms to enter data, local storage to cache sessions, API patterns to handle async, auth to know who you are. Week 14 is the final step: notifications and deployment — making the app shippable to real users.*
