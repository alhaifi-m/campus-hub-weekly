// week13
// ─────────────────────────────────────────────────────────────────────────────
// db.ts — All Supabase database queries for Campus Hub.
//
// This replaces the mock functions in api.ts for courses and dashboard data.
// api.ts is kept around for reference but is no longer called by the app screens.
//
// Tables queried here:
//   enrollments   — the user's enrolled courses + grades + attendance
//   courses       — course catalog (joined via enrollments)
//   deadlines     — upcoming assignments per course
//   announcements — per-course announcements
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

// A row from the courses table
type DbCourse = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  room: string;
  description: string;
};

// Shape of the raw enrollment + joined course row returned by Supabase
type EnrollmentRow = {
  id: string;
  grade: string;
  attendance_attended: number;
  attendance_total: number;
  courses: DbCourse;
};

// What screens get back from getEnrolledCourses()
export type EnrolledCourse = DbCourse & {
  enrollmentId: string;
  grade: string;
  attendanceAttended: number;
  attendanceTotal: number;
};

// What screens get back from getCourseDetail()
export type CourseDetail = EnrolledCourse & {
  announcements: Array<{ id: string; body: string; createdAt: string }>;
  deadlines: Array<{ id: string; title: string; dueDate: string }>;
};

// What the home screen gets back from getDashboardData()
export type DashboardData = {
  greeting: string;
  nextDeadline: { course: string; title: string; dueDate: string } | null;
  attendance: { attended: number; total: number; percentage: number };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// ── Query Functions ───────────────────────────────────────────────────────────

/**
 * getEnrolledCourses
 * Fetches the courses a user is enrolled in, along with their grade and
 * attendance for each course.
 *
 * Used by: app/(tab)/courses/index.tsx
 */
export const getEnrolledCourses = async (userId: string): Promise<EnrolledCourse[]> => {
  const { data, error } = await supabase
    // "enrollments" → the name of the TABLE we are querying
    .from("enrollments")
    // .select() → choose which columns to return (like SELECT in SQL)
    // Columns listed at the top level come from the enrollments table.
    // "courses ( ... )" is a nested select — Supabase sees that enrollments.course_id
    // is a foreign key pointing to courses.id and automatically JOINs the two tables.
    // Columns listed inside courses ( ... ) come from the courses table.
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
    // .eq() → WHERE user_id = userId  (only return rows that belong to this user)
    // RLS also enforces this at the database level — this is belt-and-suspenders.
    .eq("user_id", userId)
    // .order() → ORDER BY created_at ASC  (show courses in the order they were enrolled)
    .order("created_at");

  if (error) throw error;

  // Supabase returns enrollments with a nested courses object.
  // We flatten both into one object so screens don't have to dig into row.courses.title.
  return (data as unknown as EnrollmentRow[]).map((row) => ({
    enrollmentId: row.id,           // from enrollments table
    grade: row.grade,               // from enrollments table
    attendanceAttended: row.attendance_attended, // from enrollments table
    attendanceTotal: row.attendance_total,       // from enrollments table
    ...row.courses,                 // spreads id, code, title, instructor, etc. from courses table
  }));
};

/**
 * getCourseDetail
 * Fetches a single course the user is enrolled in, plus its announcements
 * and deadlines.
 *
 * Used by: app/(tab)/courses/[id].tsx
 */
export const getCourseDetail = async (
  courseId: string,
  userId: string
): Promise<CourseDetail> => {
  // ── Query 1: enrollment + course info ──────────────────────────────────────
  // We need the student's grade and attendance (from enrollments)
  // AND the course details like title and instructor (from courses).
  // One query with a nested select handles both.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")                   // TABLE: enrollments
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
    // WHERE course_id = courseId  (the course we're looking at)
    .eq("course_id", courseId)
    // AND user_id = userId  (must be OUR enrollment, not someone else's)
    .eq("user_id", userId)
    // .single() → we expect exactly one row. Throws if 0 or more than 1 row returned.
    .single();

  if (enrollmentError) throw enrollmentError;

  // ── Query 2: announcements for this course ─────────────────────────────────
  // Announcements belong to a course (course_id FK), not to a specific student.
  // RLS still applies: only visible if you are enrolled in that course.
  const { data: announcements, error: announcementsError } = await supabase
    .from("announcements")                         // TABLE: announcements
    .select("id, body, created_at")                // columns we need
    .eq("course_id", courseId)                     // WHERE course_id = courseId
    .order("created_at", { ascending: false });    // newest announcement first

  if (announcementsError) throw announcementsError;

  // ── Query 3: deadlines for this course ────────────────────────────────────
  // Deadlines also belong to a course, not a student.
  // We show ALL deadlines, sorted soonest first.
  const { data: deadlines, error: deadlinesError } = await supabase
    .from("deadlines")                 // TABLE: deadlines
    .select("id, title, due_date")     // columns we need
    .eq("course_id", courseId)         // WHERE course_id = courseId
    .order("due_date");                // ORDER BY due_date ASC (soonest first)

  if (deadlinesError) throw deadlinesError;

  const row = enrollment as unknown as EnrollmentRow;

  return {
    enrollmentId: row.id,
    grade: row.grade,
    attendanceAttended: row.attendance_attended,
    attendanceTotal: row.attendance_total,
    ...row.courses,
    announcements: (announcements ?? []).map((a) => ({
      id: a.id,
      body: a.body,
      createdAt: a.created_at,
    })),
    deadlines: (deadlines ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      dueDate: d.due_date,
    })),
  };
};

/**
 * getDashboardData
 * Fetches the data needed for the home screen:
 *   - Next upcoming deadline across all enrolled courses
 *   - Aggregate attendance (total attended / total classes)
 *
 * Used by: app/(tab)/home.tsx
 */
export const getDashboardData = async (userId: string): Promise<DashboardData> => {
  // ── Query 1: all enrollments for this user ─────────────────────────────────
  // We need two things from enrollments:
  //   1. course_id — so we can look up deadlines for the right courses in Query 2
  //   2. attendance columns — to calculate the aggregate attendance percentage
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")                                          // TABLE: enrollments
    .select("course_id, attendance_attended, attendance_total")   // only the columns we need
    .eq("user_id", userId);                                       // WHERE user_id = userId

  if (enrollmentsError) throw enrollmentsError;

  // Pull out just the course IDs — needed for the .in() filter in Query 2
  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  // Add up attendance numbers across ALL enrolled courses
  const attended = (enrollments ?? []).reduce(
    (sum, e) => sum + e.attendance_attended,
    0
  );
  const total = (enrollments ?? []).reduce(
    (sum, e) => sum + e.attendance_total,
    0
  );

  // ── Query 2: next upcoming deadline ───────────────────────────────────────
  // We can only run this query after Query 1, because we need courseIds first.
  let nextDeadline: DashboardData["nextDeadline"] = null;

  if (courseIds.length > 0) {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    const { data: deadline, error: deadlineError } = await supabase
      .from("deadlines")                     // TABLE: deadlines
      .select("title, due_date, courses(code)") // also grab the course code via FK join
      // WHERE course_id IN (courseId1, courseId2, ...) — only deadlines for MY courses
      .in("course_id", courseIds)
      // AND due_date >= today — only future deadlines, not past ones
      .gte("due_date", today)
      // ORDER BY due_date ASC — soonest deadline first
      .order("due_date")
      // LIMIT 1 — we only want the very next deadline
      .limit(1)
      // .maybeSingle() → returns null if no upcoming deadlines (that's okay)
      // Unlike .single(), it does NOT throw when zero rows are returned.
      .maybeSingle();

    if (deadlineError) throw deadlineError;

    if (deadline) {
      const courseCode = (deadline.courses as unknown as { code: string } | null)?.code ?? "";
      nextDeadline = {
        course: courseCode,
        title: deadline.title,
        dueDate: deadline.due_date,
      };
    }
  }

  return {
    greeting: getGreeting(),
    nextDeadline,
    attendance: {
      attended,
      total,
      percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
    },
  };
};
