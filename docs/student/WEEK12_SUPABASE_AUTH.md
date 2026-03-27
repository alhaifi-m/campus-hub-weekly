# Week 12: Supabase Auth

## Building a Real Login Flow — Sign Up, Sign In, Protected Routes, Session Persistence

---

## Table of Contents

1. [Before vs After](#before-vs-after)
2. [Architecture Impact](#architecture-impact)
3. [New Concepts](#new-concepts)
4. [Step-by-Step Implementation](#step-by-step)
5. [Common Mistakes](#common-mistakes)
6. [Student Challenge](#student-challenge)

---

## Before vs After <a name="before-vs-after"></a>

### Before (Week 11)

```
App opens → home screen loads immediately
├── No login required
├── No concept of "who is using the app"
└── Anyone who opens the app sees everything
```

The app is entirely open. There are no users, no accounts, no sessions. The profile form saves to local storage but has no connection to a real identity. Anyone on any device sees the same data.

### After (Week 12)

```
App opens
├── Checking session... (spinner)
│
├── No session → /login
│   ├── Email + password → Sign In → home screen
│   └── "Don't have an account?" → /signup → create account → sign in
│
└── Session found (was already logged in)
    └── /(tab)/home (direct, no login prompt)

Home screen
├── "you@example.com" (the signed-in user's email)
└── dashboard cards (same as before)

Settings screen
├── Notifications toggle
├── Account (profile form)
└── Sign Out → back to /login

All tabs are now PROTECTED — navigating directly to /(tab)/home
without a session immediately redirects to /login.
```

---

## Architecture Impact <a name="architecture-impact"></a>

### New Files

```
lib/
└── supabase.ts          ← NEW: Supabase client (the connection to your backend)

context/
└── AuthContext.tsx      ← NEW: Auth state shared across the whole app

app/
├── login.tsx            ← NEW: Sign-in screen
└── signup.tsx           ← NEW: Sign-up screen
```

### Modified Files

```
app/
├── _layout.tsx          ← MODIFIED: wrap app in AuthProvider + AuthGuard
└── index.tsx            ← MODIFIED: auth-based redirect (login or home)

app/(tab)/
├── home.tsx             ← MODIFIED: shows signed-in user's email
└── settings/
    └── index.tsx        ← MODIFIED: Sign Out button added
```

### Why This Structure?

```
_layout.tsx
└── AuthProvider           ← wraps everything, owns session state
    └── AuthGuard          ← watches session + current route → redirects
        └── Stack          ← renders the actual screens
            ├── (tab)/     ← PROTECTED: redirected away if no session
            ├── login      ← PUBLIC: shown when not signed in
            └── signup     ← PUBLIC: shown when not signed in
```

Every screen inside `(tab)/` is automatically protected. You don't need to add auth checks to each screen individually — `AuthGuard` handles all of it from one place.

---

## New Concepts <a name="new-concepts"></a>

### 1. Authentication vs Authorization

These two words are often confused. They mean different things:

| Term | Question it answers | Example |
|------|--------------------|---------|
| **Authentication** | Who are you? | "Are you logged in?" |
| **Authorization** | What can you do? | "Can you access this course?" |

Week 12 is purely **authentication** — we establish who the user is. Authorization (checking what each user can access) comes in Week 13 with Row Level Security.

### 2. React Context API

Before this week, data was passed between components using props — a parent component passes values down to child components. That works for closely related components, but auth state is needed *everywhere*: the root layout, every tab, the settings screen.

**Prop drilling** is the alternative — passing auth state as props through every level of the tree. It would look like:

```
_layout → (tab) → home → (every component that needs the user)
```

That's messy, repetitive, and hard to maintain.

**Context** solves this. It creates a "global store" that any component can read:

```tsx
// Any screen, anywhere in the tree:
const { user, signOut } = useAuth();
```

Think of Context as a radio broadcast — it transmits on one frequency, and any component that "tunes in" with `useAuth()` receives the signal. No wiring required.

### 3. The Auth Lifecycle

There are exactly four things that can happen to a session:

```
SIGNED_OUT → SIGNED_IN
SIGNED_IN  → SIGNED_OUT
SIGNED_IN  → TOKEN_REFRESHED  (automatic, every hour)
SIGNED_OUT → PASSWORD_RECOVERY (from "forgot password" email)
```

`supabase.auth.onAuthStateChange()` subscribes to all of these. The listener fires whenever the state changes, and our `AuthContext` updates `session` state in response. This means the UI automatically reflects the current auth state — no manual tracking needed.

### 4. Protected Routes Pattern

The `AuthGuard` component in `_layout.tsx` uses two hooks:

- `useSegments()` — returns the current URL path as an array. On `/login`, it returns `["login"]`. On `/(tab)/home`, it returns `["(tab)", "home"]`.
- `useRouter()` — provides `router.replace()` for navigation.

The guard logic:

```
if (no session AND in (tab)) → redirect to /login
if (session AND on login/signup) → redirect to /(tab)/home
```

This runs every time `session` or `segments` changes. When `signOut()` sets the session to `null`, the guard fires and sends the user to `/login`. When `signIn()` sets a session, the guard fires and sends the user to `/(tab)/home`.

### 5. JWT Tokens and Sessions (Conceptual)

When you sign in, Supabase returns a **JWT** (JSON Web Token) — a signed string that proves your identity. It has:
- Who you are (your user ID and email)
- When it was issued
- When it expires (typically 1 hour)

Supabase automatically refreshes this token before it expires (`autoRefreshToken: true`). The session — which includes the JWT and your user info — is saved to `AsyncStorage` (`persistSession: true`). When the app restarts, it reads the session from `AsyncStorage` and you're still logged in without typing your password again.

This is "stay logged in" — the same pattern used by every app you've ever used.

### 6. Environment Variables

API keys must never be hardcoded in source code. If you commit your keys, anyone with access to the repo can use your Supabase project.

The solution: **environment variables** in a `.env` file that is **gitignored**.

```
# .env (gitignored — never committed)
EXPO_PUBLIC_SUPABASE_URL=https://abcde.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
```

```ts
// lib/supabase.ts — reads from process.env at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
```

The `EXPO_PUBLIC_` prefix is required for Expo to embed the variable in the JavaScript bundle. Variables without this prefix are not available in the app.

The `.env.example` file in the repo shows the structure without real values — it's safe to commit and shows teammates what they need.

---

## Step-by-Step Implementation <a name="step-by-step"></a>

### Step 1 — Set Up a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**. Give it a name (e.g. "campus-hub") and a database password. Pick the region closest to you.
3. Wait ~2 minutes for the project to provision.
4. Go to **Settings → API**.
5. Copy **Project URL** and **Project API Keys → anon / public**.

### Step 2 — Create the `.env` File

In the project root, create a `.env` file (copy from `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

The `.env` file is in `.gitignore`. It stays on your machine only.

### Step 3 — Install `@supabase/supabase-js`

```bash
npm install @supabase/supabase-js
```

> **Note:** After adding a new package, restart the Expo bundler (`npx expo start --clear`).

### Step 4 — Create `lib/supabase.ts`

This file creates the single Supabase client that the whole app shares:

```ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,       // save session to device storage
    autoRefreshToken: true,      // auto-refresh JWTs
    persistSession: true,        // keep session across restarts
    detectSessionInUrl: false,   // no browser URL needed in RN
  },
});
```

**Why `AsyncStorage` as the storage adapter?**
Supabase needs somewhere to save the session token. In a browser, it uses `localStorage`. In React Native, we tell it to use `AsyncStorage` instead — the same storage layer from Week 9. The session is saved just like any other value: `AsyncStorage.setItem("supabase.auth.token", ...)`.

### Step 5 — Create `context/AuthContext.tsx`

Create the `context/` folder in the project root, then create `AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load any existing session from AsyncStorage (from a previous sign-in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Subscribe to all future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be called inside <AuthProvider>");
  return context;
};
```

**Key points:**

- `isLoading: true` until `getSession()` resolves. This prevents a flash of the login screen on cold start when the user is already signed in.
- `onAuthStateChange` is the single place that updates `session`. After calling `signIn()`, `signOut()`, or `signUp()`, the listener fires automatically — the component doesn't need to do anything extra.
- `useAuth()` throws if called outside `<AuthProvider>`. A hard error is better than a silent null that causes confusing crashes later.

### Step 6 — Update `app/_layout.tsx`

```tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

// AuthGuard enforces protected routes globally
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabGroup = segments[0] === "(tab)";

    if (!session && inTabGroup) {
      router.replace("/login");    // not signed in, kick to login
    } else if (session && !inTabGroup) {
      router.replace("/(tab)/home"); // signed in, go to app
    }
  }, [session, isLoading, segments]);

  return <>{children}</>;
};

const RootLayout = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tab)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
      </AuthGuard>
    </AuthProvider>
  );
};

export default RootLayout;
```

**Note about `AuthGuard`:** It's a component, not just a function, because it needs to call hooks (`useAuth`, `useSegments`, `useRouter`). Hooks can only be called from inside components — not from module-level code.

### Step 7 — Update `app/index.tsx`

```tsx
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { theme } from "../styles/theme";

const Index = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? "/(tab)/home" : "/login"} />;
};

export default Index;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
  },
});
```

### Step 8 — Create `app/login.tsx`

The login screen uses the same React Hook Form + Zod pattern from Week 8 and 9. Two fields: email and password. On submit, calls `signIn()` from `AuthContext`. On success, the `onAuthStateChange` listener sets the session, which triggers `AuthGuard` to navigate to `/(tab)/home`.

Key points:
- `authError` state is separate from Zod validation errors — it shows Supabase-level errors like "Invalid login credentials"
- The submit button shows an `ActivityIndicator` while the request is in flight
- Navigation after sign-in is handled by `AuthGuard`, not by an explicit `router.push()` in the submit handler

### Step 9 — Create `app/signup.tsx`

The sign-up screen adds one important Zod pattern: **cross-field validation** using `.refine()`:

```ts
const signUpSchema = z.object({
  email: z.string().trim().email("..."),
  password: z.string().min(6, "..."),
  confirmPassword: z.string().min(1, "..."),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match.",
    path: ["confirmPassword"],   // which field gets the error
  }
);
```

`.refine()` runs after all individual field checks pass. The `path` tells Zod which field in the form to show the error under.

After successful sign-up, two things can happen:
- **Email confirmation enabled (Supabase default):** No session yet — show a "check your inbox" screen
- **Email confirmation disabled (dev setting):** Session is set immediately — `AuthGuard` redirects to `/(tab)/home`

### Step 10 — Update `settings/index.tsx`

Add a Sign Out button:

```tsx
import { useAuth } from "../../../context/AuthContext";

// In the component:
const { signOut } = useAuth();

const handleSignOut = async () => {
  await signOut();
  // No router.push() needed — AuthGuard handles the redirect to /login
};

// In JSX:
<Pressable onPress={handleSignOut}>
  <AppCard
    title="Sign Out"
    subtitle="Sign out of your account"
    right={
      <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
    }
  />
</Pressable>
```

### Step 11 — Update `home.tsx`

Show the signed-in user's email:

```tsx
import { useAuth } from "../../context/AuthContext";

// In the component:
const { user } = useAuth();

// In JSX (after the title):
{user?.email && (
  <Text style={styles.userEmail}>{user.email}</Text>
)}
```

---

## Common Mistakes <a name="common-mistakes"></a>

### 1. Forgetting the `EXPO_PUBLIC_` prefix

```ts
// ❌ Wrong — this value will be undefined in the app
const url = process.env.SUPABASE_URL;

// ✅ Correct — Expo embeds EXPO_PUBLIC_ vars at build time
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
```

### 2. Calling `useAuth()` outside `<AuthProvider>`

```tsx
// ❌ Wrong — _layout.tsx renders AuthProvider, but RootLayout itself
//           is not inside AuthProvider yet, so useAuth() would throw.

const RootLayout = () => {
  const { session } = useAuth(); // ← throws: "must be inside <AuthProvider>"
  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
};

// ✅ Correct — put the hook call in a child component that IS inside AuthProvider
const AuthGuard = () => {
  const { session } = useAuth(); // ← works: AuthGuard renders inside AuthProvider
  ...
};

const RootLayout = () => (
  <AuthProvider>
    <AuthGuard><Stack /></AuthGuard>
  </AuthProvider>
);
```

### 3. Navigating manually after sign-in

```tsx
// ❌ Wrong — AuthGuard already handles this; double-navigation causes issues
const onSubmit = async (data) => {
  await signIn(data.email, data.password);
  router.replace("/(tab)/home"); // ← don't do this
};

// ✅ Correct — let AuthGuard react to the session change
const onSubmit = async (data) => {
  await signIn(data.email, data.password);
  // Done. AuthGuard will redirect when onAuthStateChange fires.
};
```

### 4. Not handling the `isLoading` state

```tsx
// ❌ Wrong — flashes the login screen on every cold start, even for signed-in users
const Index = () => {
  const { session } = useAuth();
  return <Redirect href={session ? "/(tab)/home" : "/login"} />;
};

// ✅ Correct — show a spinner while AsyncStorage loads
const Index = () => {
  const { session, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  return <Redirect href={session ? "/(tab)/home" : "/login"} />;
};
```

### 5. Committing the `.env` file

```bash
# ❌ Wrong — exposes your Supabase keys to anyone who clones the repo
git add .env
git commit -m "add env vars"

# ✅ Correct — .env is in .gitignore; only .env.example is committed
git add .env.example
git commit -m "add env example"
```

### 6. Using the service_role key in the app

The Supabase dashboard shows two keys: `anon` and `service_role`. The `service_role` key bypasses Row Level Security and has full database access. **Never put `service_role` in a mobile app** — it's embedded in the JS bundle and visible to anyone who inspects the app.

The `anon` key is designed for client use. It only has access to what you explicitly allow in RLS policies.

---

## Student Challenge <a name="student-challenge"></a>

### Part 1 — Test the Full Auth Flow (Required)

1. Create an account using the sign-up screen
2. Sign out from Settings
3. Sign in with the same account
4. Force-close the app and reopen it — you should still be signed in (session persistence)
5. Sign out again — you should land on the login screen

### Part 2 — Test Protection (Required)

Using the Expo dev menu or a deep link, try navigating directly to `/(tab)/home` while signed out. Confirm that `AuthGuard` redirects you to `/login`.

### Part 3 — Show the User's Email in Profile (Bonus)

In `app/(tab)/settings/profile.tsx`, pre-fill the email field with the signed-in user's email on first load. Use `useAuth()` to get `user?.email` and pass it as the `defaultValues.email` in `useForm()`.

**Hint:**
```tsx
const { user } = useAuth();

const { control, ... } = useForm<ProfileForm>({
  defaultValues: {
    email: user?.email ?? "",
    // ...
  },
});
```

### Part 4 — Password Visibility Toggle (Double Bonus)

Add an eye icon (`eye-outline` / `eye-off-outline`) to the password fields on the login and sign-up screens that toggles between hidden (`secureTextEntry={true}`) and visible (`secureTextEntry={false}`).

**Hint:** Add a `showPassword` state variable and a `Pressable` inside a `View` that wraps the `TextInput`.

---

*Week 12 adds the first real backend integration to Campus Hub. Every screen is now protected — unauthenticated users cannot reach any tab. The auth pattern (Context + AuthGuard + Supabase listener) is the industry standard for React Native apps and scales to any number of screens without modification.*
