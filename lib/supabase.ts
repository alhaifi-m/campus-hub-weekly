// Week 12: Supabase Auth — NEW file
// ─────────────────────────────────────────────────────────────────────────────
// Supabase client — the single connection point between the app and Supabase.
//
// Key decisions:
//   storage: AsyncStorage   → sessions survive app restarts (Week 9 pattern)
//   autoRefreshToken: true  → Supabase silently refreshes the JWT before it expires
//   persistSession: true    → session is saved to AsyncStorage automatically
//   detectSessionInUrl: false → no browser URL parsing; we're in a native app
//
// The URL and anon key come from environment variables (.env file, gitignored).
// In Expo, any env var prefixed EXPO_PUBLIC_ is embedded in the JS bundle at
// build time — safe for the anon key, but NEVER use the service_role key here.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Week 12 - Class Code
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,  // persist session across app restarts
    autoRefreshToken: true, // silently refresh JWTs before they expire
    persistSession: true,   // save session to AsyncStorage on sign in
    detectSessionInUrl: false, // disable browser URL parsing (not a web app)
  },
});
