// Week 12: Supabase Auth — MODIFIED
// Wraps the entire app in AuthProvider and adds AuthGuard for protected routes.
//
// AuthGuard pattern:
//   - Watches session + current route segments
//   - If no session + inside (tab) group → redirect to /login
//   - If session exists + on login/signup → redirect to /(tab)/home
//   This means every protected screen is automatically guarded — no manual
//   checks needed in each tab screen.
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

// ── AuthGuard ─────────────────────────────────────────────────────────────────
// Inner component — reads auth state and enforces route protection.
// Rendered inside AuthProvider so it can call useAuth().
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
  // segments: array of route path parts for the current screen,
  // e.g. ["(tab)", "home"] when on the Home tab, or ["login"] on the login screen.
  // segments[0] tells us which top-level group we're in.
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait until we know if a session exists

    // true when the user is inside a protected tab screen (e.g. home, profile)
    const inTabGroup = segments[0] === "(tab)";

    if (!session && inTabGroup) {
      // Not signed in, but trying to view a protected tab → kick to login
      router.replace("/login");
    } else if (session && !inTabGroup) {
      // Signed in, but sitting on login/signup/index → go to the app
      router.replace("/(tab)/home");
    }
  }, [session, isLoading, segments]);

  // Don't render any screen until we know the auth state.
  // Without this, the home screen flashes briefly before the redirect fires.
  if (isLoading) return null;

  return <>{children}</>;
};

// ── Root Layout ───────────────────────────────────────────────────────────────

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
