// Week 10: API Calls + Loading States — NEW file
// ─────────────────────────────────────────────────────────
// Mock API — simulates network requests with async/await
// Replace with real API (e.g., Supabase) in Week 13.
// ─────────────────────────────────────────────────────────

// Week 10: toggle this to true to simulate a network failure and demo the error state
const SHOULD_FAIL = false; // set to true to demo error state

// Week 10: TypeScript types for all API responses
export type Course = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  room: string;
  grade: string;
};

export type CourseDetail = Course & {
  description: string;
  nextDeadline: string;
  attendance: string;
  announcements: string[];
};

export type DashboardData = {
  nextDeadline: { course: string; title: string; dueDate: string };
  attendance: { attended: number; total: number; percentage: number };
  greeting: string;
};

// Week 10: helper — simulates network latency so you can see the loading state
// Returns a Promise that resolves after `ms` milliseconds (default 800ms).
// new Promise() creates a promise manually; setTimeout fires resolve() after the delay,
// which causes any "await delay()" call to pause execution for that duration.
function delay(ms: number = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Week 10: helper — throws when SHOULD_FAIL is true, triggering the error state
// Throwing inside an async function causes the returned Promise to reject,
// which means any "await maybeThrow()" call will jump to the nearest catch() block.
// Flip SHOULD_FAIL to true at the top of this file to demo the error UI in class.
function maybeThrow(): void {
  if (SHOULD_FAIL) {
    throw new Error("Network request failed. Please check your connection.");
  }
}

// Returns a time-appropriate greeting string based on the current device clock.
// new Date().getHours() gives 0–23; we bucket that into morning / afternoon / evening.
// Called inside getDashboard() so the greeting is always fresh at fetch time.
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Week 10: mock data — replace with real Supabase/REST calls in Week 13
const COURSES: Course[] = [
  {
    id: "cprg216",
    code: "CPRG-216",
    title: "Advanced Web Systems",
    instructor: "Prof. Sarah Chen",
    schedule: "Mon/Wed 10:00 - 11:30",
    room: "T310",
    grade: "B+",
  },
  {
    id: "cprg303",
    code: "CPRG-303",
    title: "Mobile Development",
    instructor: "Prof. James Miller",
    schedule: "Tue/Thu 13:00 - 14:30",
    room: "S205",
    grade: "A-",
  },
  {
    id: "cprg306",
    code: "CPRG-306",
    title: "Backend APIs",
    instructor: "Prof. Amy Tran",
    schedule: "Wed/Fri 09:00 - 10:30",
    room: "N102",
    grade: "In Progress",
  },
];

const COURSE_DETAILS: Record<string, CourseDetail> = {
  cprg216: {
    ...COURSES[0],
    description:
      "Covers modern web frameworks, server-side rendering, and progressive web apps. Students build a full-stack web application using current industry tools.",
    nextDeadline: "Assignment 3 - Feb 21",
    attendance: "12/14 classes attended",
    announcements: [
      "Midterm grades posted — check your portal.",
      "Assignment 3 due date extended to Feb 21.",
      "Guest lecture next Wednesday: Industry panel on web performance.",
    ],
  },
  cprg303: {
    ...COURSES[1],
    description:
      "Introduction to cross-platform mobile development with React Native and Expo. Students build a campus utility app from scratch over 8 weeks.",
    nextDeadline: "Lab 10 - Feb 24",
    attendance: "14/14 classes attended",
    announcements: [
      "Week 10 guide is now available on D2L.",
      "Final project proposal due in 2 weeks.",
    ],
  },
  cprg306: {
    ...COURSES[2],
    description:
      "Designing and building RESTful APIs with Node.js and Express. Covers authentication, database integration, and API documentation with OpenAPI.",
    nextDeadline: "Project Milestone 2 - Feb 28",
    attendance: "10/14 classes attended",
    announcements: [
      "Office hours moved to Thursday 3-4 PM this week.",
      "API documentation workshop this Friday — bring your laptops.",
      "Milestone 1 feedback available in your repo.",
    ],
  },
};

const DASHBOARD: DashboardData = {
  nextDeadline: {
    course: "CPRG-216",
    title: "Assignment 3",
    dueDate: "Feb 21",
  },
  attendance: { attended: 36, total: 42, percentage: 86 },
  greeting: "", // filled dynamically
};

// Week 10: exported async API functions — each awaits delay(), then maybeThrow(), then returns data

// Returns the full list of courses after a simulated network delay.
// The return type Promise<Course[]> means callers must await it to get the array.
// Pattern: pause → maybe fail → return data. This is identical to how real fetch() calls work.
export async function getCourses(): Promise<Course[]> {
  await delay();
  maybeThrow();
  return COURSES;
}

// Looks up a single course by its id string (e.g. "cprg303").
// COURSE_DETAILS[id] uses the id as a key on a plain object — if it doesn't exist the
// value is undefined, so we throw a descriptive error instead of returning undefined.
// This mirrors real APIs that return 404 for unknown resources.
export async function getCourseById(id: string): Promise<CourseDetail> {
  await delay();
  maybeThrow();
  const course = COURSE_DETAILS[id];
  if (!course) {
    throw new Error(`Course "${id}" not found.`);
  }
  return course;
}

// Returns the dashboard summary: next deadline, attendance stats, and a greeting.
// { ...DASHBOARD, greeting: getGreeting() } uses spread to copy the DASHBOARD object
// and then overrides the greeting field with a freshly computed value — so the greeting
// always reflects the time of the actual API call, not when the file loaded.
export async function getDashboard(): Promise<DashboardData> {
  await delay();
  maybeThrow();
  return { ...DASHBOARD, greeting: getGreeting() };
}
