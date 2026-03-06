# Week 9: Local Storage

## Persisting Data with AsyncStorage in React Native

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

### Before (Week 8)

```
Settings tab
├── Notifications toggle (works... until you leave the screen)
└── Account → Edit Profile form
    ├── 5 validated fields (work... until you leave the screen)
    └── Save button shows an alert, but data vanishes
```

The app has a form that validates correctly, but nothing is remembered. Close the app, reopen it — every field is blank again. Toggle notifications off, switch tabs, come back — it's on again. The app has amnesia.

### After (Week 9)

```
Settings tab
├── Notifications toggle (PERSISTS across app restarts)
└── Account → Profile screen
    ├── VIEW MODE (when data exists)
    │   ├── Shows saved data as read-only text in a card
    │   └── "Edit Profile" button → switches to edit mode
    │
    └── EDIT MODE (first visit, or after tapping Edit)
        ├── 5 validated fields (PRE-FILLED with saved data)
        ├── "Save Profile" button → saves data + switches to view mode
        └── "Cancel" button → discards changes + returns to view mode
```

Now the app remembers. Toggle notifications off → close the app → reopen → still off. Fill in your profile → save → see your data displayed cleanly → come back later → still there. The app has memory.

---

## Architecture Impact <a name="architecture-impact"></a>

### New File

```
lib/
└── storage.ts    ← NEW: utility for reading/writing to device storage
```

### Modified Files

```
app/(tab)/settings/index.tsx     ← MODIFIED: loads + saves notification toggle
app/(tab)/settings/profile.tsx   ← MODIFIED: loads + saves profile data
```

### Updated Architecture Diagram

```
    app/_layout.tsx .................. Stack (Root)
        |
        └── app/(tab)/_layout.tsx ... Tabs
                |
                ├── home.tsx ........ Tab Screen (simple)
                |
                ├── courses/_layout.tsx .. Stack (Nested)
                |       |
                |       ├── index.tsx ... Courses list
                |       └── [id].tsx .... Course details
                |
                └── settings/_layout.tsx . Stack (Nested)
                        |
                        ├── index.tsx ... Settings list (now loads/saves toggle)
                        └── profile.tsx . Edit Profile (now loads/saves data)

    lib/
    └── storage.ts .................. Storage utility (NEW)
```

### Why a Storage Utility?

AsyncStorage only stores strings. Every time you save an object, you need `JSON.stringify()`. Every time you read it back, you need `JSON.parse()`. Writing this boilerplate in every component is repetitive and error-prone.

Instead, we create a **utility module** — a file with helper functions that wrap the repetitive parts. Components call `storage.get()` and `storage.set()` without thinking about JSON.

```
Without utility (repetitive):              With utility (clean):
──────────────────────────                 ─────────────────────
const json = await AsyncStorage            const data = await storage.get("profile");
  .getItem("profile");
const data = json
  ? JSON.parse(json) : null;
```

---

## New Concepts <a name="new-concepts"></a>

### 1. AsyncStorage — Your App's Notepad

Think of AsyncStorage as a notepad that lives on the user's device. Your app can write notes (save data) and read them later (load data). The notepad survives even when the app is closed — it's stored on the device's file system, not in memory.

```
┌─────────────────────────────────────────────┐
│              AsyncStorage                    │
│                                             │
│   Key               Value                   │
│   ───               ─────                   │
│   "notifications"   true                     │
│   "profile"         { firstName: "Jane",     │
│                       lastName: "Smith",      │
│                       email: "jane@edu.ca",  │
│                       studentId: "A00123456",│
│                       phone: "(403)555-0123"}│
│                                             │
│   Everything is stored as strings            │
│   (JSON.stringify on write, JSON.parse on read) │
└─────────────────────────────────────────────┘
```

**Key facts:**
- It's a **key-value store** — like a dictionary. You save data under a key name, then retrieve it using that same key.
- It stores **strings only** — objects and booleans must be converted to/from JSON strings.
- It's **async** — every operation returns a Promise, so you use `await`.
- It's **not secure** — don't store passwords or tokens here. (We'll learn about secure storage in Week 12.)
- It's **persistent** — data survives app restarts, but not app uninstalls.

### 2. useEffect — Running Code When a Component Mounts

Until now, every line of code in your components ran on every render. But loading data from storage should only happen **once** — when the component first appears on screen. That's what `useEffect` does.

```
    Component renders for the first time
              │
              ▼
    useEffect runs (loads data from storage)
              │
              ▼
    Data arrives → setState → component re-renders with data
              │
              ▼
    useEffect does NOT run again (empty dependency array)
```

**The syntax:**

```tsx
useEffect(() => {
  // This code runs ONCE after the first render
}, []);
//  ^^ empty array = "no dependencies" = "only run on mount"
```

**The empty array `[]`** is called the dependency array. It tells React: "There's nothing this effect depends on, so only run it once." If you forget the `[]`, the effect runs on **every** render — which means infinite loops if the effect updates state.

### 3. Async Functions Inside useEffect

`useEffect` does not support `async` directly. You can't write `useEffect(async () => { ... })`. Instead, define an async function inside and call it immediately:

```tsx
// ❌ WRONG — useEffect can't be async
useEffect(async () => {
  const data = await storage.get("profile");
}, []);

// ✅ CORRECT — define async function inside, then call it
useEffect(() => {
  async function loadProfile() {
    const data = await storage.get("profile");
    if (data) setFirstName(data.firstName);
  }
  loadProfile();
}, []);
```

**Why this pattern?** `useEffect` can return a cleanup function (for later weeks). If it were `async`, it would return a Promise instead, which React doesn't know how to clean up. So the workaround is to put the async logic in a nested function.

### 4. Loading State — Preventing the Flash

Without a loading state, here's what happens:

```
1. Component renders → shows empty form (fields blank)
2. useEffect fires → starts loading from storage
3. Data arrives → fields fill in
```

The user sees a brief flash of empty fields before data appears. This looks buggy. The fix:

```
1. Component renders → isLoading is true → shows spinner
2. useEffect fires → loads data → sets fields → sets isLoading to false
3. Component re-renders → shows filled form (no flash)
```

```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function load() {
    const data = await storage.get("profile");
    if (data) { /* populate fields */ }
    setIsLoading(false);  // Done loading, show the form
  }
  load();
}, []);

if (isLoading) {
  return <ActivityIndicator />;  // Show spinner while loading
}

return (
  // ... your actual form
);
```

### 5. Secure vs Regular Storage (Conceptual)

| | AsyncStorage | SecureStore |
|--|-------------|-------------|
| **What it stores** | Preferences, cached data | Passwords, tokens, secrets |
| **Security** | Plain text on device | Encrypted (uses device keychain) |
| **Speed** | Fast | Slightly slower (encryption overhead) |
| **When to use** | User preferences, form data, settings | Login tokens, API keys, sensitive data |

We use AsyncStorage this week because profile data and notification preferences aren't sensitive. In Week 12 (Auth), we'll use secure storage for authentication tokens.

---

## Step-by-Step Implementation <a name="step-by-step"></a>

### Step 1: Install AsyncStorage

Run this command in your terminal:

```bash
npx expo install @react-native-async-storage/async-storage
```

**Why `npx expo install` instead of `npm install`?** Expo ensures you get a version compatible with your Expo SDK. Regular `npm install` might grab a version that doesn't work.

---

### Step 2: Create the Storage Utility

**File:** `lib/storage.ts`

Create a new `lib/` folder in your project root, then create `storage.ts` inside it.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Typed key names to prevent typos
export const STORAGE_KEYS = {
  PROFILE: "profile",
  NOTIFICATIONS: "notifications",
} as const;

// Get a value from storage (automatically parses JSON)
export async function get<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  if (value === null) return null;
  return JSON.parse(value) as T;
}

// Set a value in storage (automatically stringifies to JSON)
export async function set(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Remove a value from storage
export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
```

**Breaking it down:**

| Function | What it does | Why it exists |
|----------|-------------|---------------|
| `get<T>(key)` | Reads a value and parses it from JSON | Without this, you'd write `JSON.parse(await AsyncStorage.getItem(key))` everywhere |
| `set(key, value)` | Stringifies a value and saves it | Without this, you'd write `AsyncStorage.setItem(key, JSON.stringify(value))` everywhere |
| `remove(key)` | Deletes a key from storage | Clean wrapper — useful for logout or clearing data |
| `STORAGE_KEYS` | Named constants for key strings | Prevents typos — `STORAGE_KEYS.PROFILE` is safer than `"proflie"` |

**The `<T>` in `get<T>`** is a TypeScript generic. It tells the function what type to return. When you call `storage.get<boolean>("notifications")`, TypeScript knows the result is `boolean | null`. When you call `storage.get<ProfileData>("profile")`, TypeScript knows it's `ProfileData | null`.

**The `as const`** on `STORAGE_KEYS` makes the values readonly and narrows their types from `string` to the literal string values (`"profile"`, `"notifications"`). This prevents accidental reassignment.

---

### Step 3: Persist the Notifications Toggle

**File:** `app/(tab)/settings/index.tsx`

Three changes to the existing file:

#### 3a. Add imports

```tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as storage from "../../../lib/storage";
import { STORAGE_KEYS } from "../../../lib/storage";
```

New additions: `useEffect` from React, `ActivityIndicator` from React Native, and our storage utility.

#### 3b. Add loading state and useEffect

```tsx
const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved notification preference on mount
  useEffect(() => {
    const loadNotifications = async () => {
      const saved = await storage.get<boolean>(STORAGE_KEYS.NOTIFICATIONS);
      if (saved !== null) {
        setNotifications(saved);
      }
      setIsLoading(false);
    };
    loadNotifications();
  }, []);
```

**What happens here:**
1. `isLoading` starts as `true` — the component shows a spinner
2. `useEffect` fires after the first render
3. Inside, `loadNotifications` reads from storage
4. If a saved value exists (`saved !== null`), it updates the toggle
5. `setIsLoading(false)` hides the spinner and shows the real UI

**Why `if (saved !== null)`?** The first time the app runs, there's nothing in storage. `get()` returns `null`. We don't want to set notifications to `null` — we keep the default `true`.

#### 3c. Save on toggle

Replace the direct `setNotifications` with a handler that also saves:

```tsx
  // Save notification preference when toggled
  const handleToggle = async (value: boolean) => {
    setNotifications(value);
    await storage.set(STORAGE_KEYS.NOTIFICATIONS, value);
  };
```

And update the Switch:

```tsx
<Switch value={notifications} onValueChange={handleToggle} />
```

**Before:** `onValueChange={setNotifications}` — only updated state (lost on unmount).
**After:** `onValueChange={handleToggle}` — updates state AND saves to storage.

#### 3d. Add loading spinner

```tsx
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
```

This goes right before the main `return`. When `isLoading` is `true`, the component returns early with just a spinner. Once loading finishes, it returns the normal UI.

---

### Step 4: Persist Profile Data with View/Edit Mode

**File:** `app/(tab)/settings/profile.tsx`

This is the biggest change this week. We're not just adding persistence — we're also adding a **view/edit mode split**. When a user opens the profile screen and data already exists, they see a clean read-only view. They tap "Edit Profile" to switch to the form.

**This builds directly on Week 8.** The Zod schema and React Hook Form setup are unchanged. We're adding three things on top: persistence via `storage`, a loading state, and a view/edit mode split.

#### 4a. Update imports

```tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { theme } from "../../../styles/theme";
import * as storage from "../../../lib/storage";
import { STORAGE_KEYS } from "../../../lib/storage";
```

Removed from Week 8: `Alert`, `router` — no longer needed. The save action switches to view mode instead of showing an alert and navigating away. The user sees their data displayed — that **is** the confirmation.

Added for Week 9: `useEffect`, `useState`, `ActivityIndicator` from React/React Native, and the storage utility.

#### 4b. Keep the Zod schema — unchanged from Week 8

```tsx
const profileSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters."),
  lastName:  z.string().trim().min(2, "Last name must be at least 2 characters."),
  email:     z.string().trim().email("Please enter a valid email address."),
  studentId: z.string().trim().length(9, "Student ID must be exactly 9 characters."),
  phone:     z.string().refine(
    (val) => val.replace(/\D/g, "").length >= 10,
    "Phone number must have at least 10 digits."
  ),
});

type ProfileForm = z.infer<typeof profileSchema>;
```

`ProfileForm` (inferred from Zod) is also the type we pass to `storage.get<ProfileForm>()`. The schema serves double duty — validation rules **and** the TypeScript type for what we save/load.

#### 4c. Add new state + expand useForm

```tsx
const [isLoading, setIsLoading]     = useState(true);
const [isEditing, setIsEditing]     = useState(false);
const [hasSavedData, setHasSavedData] = useState(false);

const {
  control,
  handleSubmit,
  reset,         // ← NEW: pre-fills the form with saved data
  watch,         // ← NEW: reads current field values for view mode + isFormFilled
  formState: { errors },
} = useForm<ProfileForm>({
  resolver: zodResolver(profileSchema),
  defaultValues: { firstName: "", lastName: "", email: "", studentId: "", phone: "" },
  mode: "onSubmit",
});

// Track field values to enable/disable the Save button
const watchedValues = watch();
const isFormFilled = Object.values(watchedValues).every((v) => v.length > 0);
```

Three new pieces of state:

| State | Purpose |
|-------|---------|
| `isLoading` | Shows spinner while loading from storage |
| `isEditing` | `false` = view card, `true` = edit form |
| `hasSavedData` | Controls whether Cancel button appears |

Two new RHF values:
- **`reset(data)`** — replaces all form field values at once. Used to pre-fill the form when loading saved data, and to restore saved values on Cancel.
- **`watch()`** — returns a live snapshot of every field's current value as an object. Re-runs on every keystroke. Used to read values for the view mode card, and to compute `isFormFilled`.

**How `isFormFilled` works:**

```ts
const watchedValues = watch();
// Returns a live object — e.g. after typing only the first name:
// { firstName: "Jane", lastName: "", email: "", studentId: "", phone: "" }

const isFormFilled = Object.values(watchedValues).every((v) => v.length > 0);
// Object.values(...) → ["Jane", "", "", "", ""]
// .every(v => v.length > 0) → false (empty strings fail the test)
// Once ALL fields have at least one character → true
```

`isFormFilled` is used to dim and disable the Save button until every field has content:

```tsx
<Pressable
  style={[styles.button, !isFormFilled && styles.buttonDisabled]}
  disabled={!isFormFilled}
  onPress={handleSubmit(onSubmit)}
>
```

**Important distinction:** `isFormFilled` is only a UI gate — it prevents tapping an obviously incomplete form. The actual validation (correct email format, exactly 9 chars for student ID, 10-digit phone) still runs inside `handleSubmit(onSubmit)` via Zod when the button is pressed. A user could fill every field with a single space and `isFormFilled` would be `true` — Zod would then catch it.

#### 4d. Load data and decide the initial mode

```tsx
useEffect(() => {
  const loadProfile = async () => {
    const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
    if (saved !== null) {
      reset(saved); // pre-fill all form fields in one call
      setHasSavedData(true);
    } else {
      setIsEditing(true); // first visit — show the form immediately
    }
    setIsLoading(false);
  };
  loadProfile();
}, []);
```

**Week 8 vs Week 9:** In Week 8, `defaultValues` were all empty strings. Now on return visits, we call `reset(saved)` to replace those defaults with the saved data. `reset()` is the React Hook Form equivalent of setting every field's state at once — one call instead of five.

**Why `if (saved !== null)`?** The first time the app runs, nothing is in storage — `get()` returns `null`. We keep the empty defaults and switch to edit mode.

#### 4e. Update onSubmit — save and switch to view mode

```tsx
// RHF calls onSubmit only after Zod validation passes
const onSubmit = async (data: ProfileForm) => {
  await storage.set(STORAGE_KEYS.PROFILE, data);
  setHasSavedData(true);
  setIsEditing(false); // switch to view mode — the view IS the confirmation
};
```

**Changes from Week 8:**
- `onSubmit` is now `async` (because `storage.set` returns a Promise)
- Instead of `Alert.alert(...)` + `router.back()`, we save to storage and switch to view mode
- `setHasSavedData(true)` ensures the Cancel button appears if they edit again

The Zod validation still runs exactly as before — `handleSubmit(onSubmit)` only calls `onSubmit` if the schema passes. Nothing changed there.

#### 4f. Add handleCancel — discard changes

```tsx
const handleCancel = async () => {
  const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
  if (saved !== null) {
    reset(saved); // restore saved values, discarding any in-progress edits
  }
  setIsEditing(false);
};
```

Cancel re-reads from storage and calls `reset(saved)` to restore the previously saved values — discarding any edits the user made to the form fields. Then switches back to view mode. Only appears when `hasSavedData` is `true`.

#### 4g. Add loading spinner

```tsx
if (isLoading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
```

This goes before the view/edit mode checks. When `isLoading` is `true`, the component returns early with just a spinner.

#### 4h. Render view mode

```tsx
// VIEW MODE — show saved profile as a read-only card
if (!isEditing) {
  const values = watch(); // reads current form values (set by reset() on load)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>My Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>First Name</Text>
          <Text style={styles.profileValue}>{values.firstName}</Text>
        </View>
        <View style={styles.divider} />
        {/* ... same pattern for lastName, email, studentId, phone ... */}
      </View>

      <Pressable style={styles.button} onPress={() => setIsEditing(true)}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </Pressable>
    </ScrollView>
  );
}
```

`watch()` returns the current form values — which after `reset(saved)` are the saved data. View mode reads from those values instead of needing separate state.

**New styles for view mode:**

```tsx
profileCard: {
  backgroundColor: theme.colors.card,
  borderRadius: theme.radius.card,
  borderWidth: 1,
  borderColor: theme.colors.border,
  overflow: "hidden",
},
profileRow: { padding: 16 },
profileLabel: { fontSize: 13, color: theme.colors.muted, marginBottom: 4 },
profileValue: { fontSize: 16, color: theme.colors.text, fontWeight: "500" },
divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
```

#### 4i. Edit mode — Controller fields unchanged, buttons updated

The five `Controller` fields are identical to Week 8. The only change is the buttons:

```tsx
{hasSavedData ? (
  <View style={styles.buttonRow}>
    <Pressable style={styles.cancelButton} onPress={handleCancel}>
      <Text style={styles.cancelButtonText}>Cancel</Text>
    </Pressable>
    <Pressable
      style={[styles.saveButton, !isFormFilled && styles.buttonDisabled]}
      onPress={handleSubmit(onSubmit)}
      disabled={!isFormFilled}
    >
      <Text style={styles.buttonText}>Save Profile</Text>
    </Pressable>
  </View>
) : (
  <Pressable
    style={[styles.button, !isFormFilled && styles.buttonDisabled]}
    onPress={handleSubmit(onSubmit)}
    disabled={!isFormFilled}
  >
    <Text style={styles.buttonText}>Save Profile</Text>
  </Pressable>
)}
```

`handleSubmit(onSubmit)` is exactly as in Week 8 — RHF runs Zod, and only calls `onSubmit` if validation passes. The Save button is disabled when any field is empty (`isFormFilled`), giving early visual feedback before the user even taps.

#### The complete screen flow

```
First visit (no saved data):
  Loading → Edit Mode (blank form, Zod validates on submit) → Save → View Mode

Return visit (data exists):
  Loading → View Mode (card) → Edit → Edit Mode (pre-filled via reset()) → Save → View Mode
                                                                          → Cancel → View Mode
```

---

## Common Mistakes <a name="common-mistakes"></a>

### 1. Forgetting the empty dependency array `[]`

```tsx
// ❌ WRONG — runs on EVERY render (infinite loop!)
useEffect(() => {
  const load = async () => { ... };
  load();
});

// ✅ CORRECT — runs ONCE on mount
useEffect(() => {
  const load = async () => { ... };
  load();
}, []);  // ← Don't forget this!
```

Without `[]`, the effect runs after every render. If the effect updates state (which triggers a render), you get an infinite loop. Your app will freeze or crash.

### 2. Making useEffect itself async

```tsx
// ❌ WRONG — useEffect cannot be async
useEffect(async () => {
  const data = await storage.get("profile");
}, []);

// ✅ CORRECT — define async arrow function inside, then call it
useEffect(() => {
  const loadProfile = async () => {
    const data = await storage.get("profile");
  };
  loadProfile();
}, []);
```

React expects `useEffect` to return either nothing or a cleanup function. An async function returns a Promise, which React can't use for cleanup.

### 3. Not checking for null before using loaded data

```tsx
// ❌ WRONG — crashes if nothing was saved yet
const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
reset(saved);  // TypeError: reset(null) — null is not a valid form object

// ✅ CORRECT — check first
const saved = await storage.get<ProfileForm>(STORAGE_KEYS.PROFILE);
if (saved !== null) {
  reset(saved); // safe — we know it's a ProfileForm object
}
```

The first time a user opens the app, nothing is in storage. `get()` returns `null`. Passing `null` to `reset()` would crash. Always null-check before using the loaded value.

### 4. Forgetting to stringify/parse (if not using the utility)

```tsx
// ❌ WRONG — stores "[object Object]" instead of JSON
await AsyncStorage.setItem("profile", profileData);

// ✅ CORRECT — but verbose
await AsyncStorage.setItem("profile", JSON.stringify(profileData));

// ✅ BEST — use the utility
await storage.set(STORAGE_KEYS.PROFILE, profileData);
```

Our utility handles this automatically, but if you ever use AsyncStorage directly, remember: it only stores strings.

### 5. Not adding a loading state

```tsx
// ❌ Problem: toggle briefly shows "true" then flips to saved value
const [notifications, setNotifications] = useState(true);

useEffect(() => {
  async function load() {
    const saved = await storage.get<boolean>(STORAGE_KEYS.NOTIFICATIONS);
    if (saved !== null) setNotifications(saved);
  }
  load();
}, []);

// The Switch renders immediately with value={true},
// then a moment later flips to the saved value (e.g., false).
// The user sees a flash.
```

The fix: add `isLoading` state, start it as `true`, set it to `false` after loading. Show a spinner while loading.

### 6. Using the wrong key name

```tsx
// ❌ WRONG — typo in key name, will never find saved data
const saved = await storage.get("profle");

// ✅ CORRECT — use the constant
const saved = await storage.get(STORAGE_KEYS.PROFILE);
```

This is exactly why `STORAGE_KEYS` exists. Constants don't have typos — if you misspell the constant name, TypeScript catches it at compile time.

---

## Student Challenge <a name="student-challenge"></a>

See [`docs/labs/LAB9_ASYNCSTORAGE.md`](../labs/LAB9_ASYNCSTORAGE.md)

---

*This guide builds directly on Week 8. The Zod schema, `zodResolver`, `useForm`, and `Controller` fields are all unchanged — we added `reset`, `watch`, persistence via `storage`, and the view/edit mode split on top. Review `WEEK8_FORMS.md` if you need a refresher on the React Hook Form + Zod setup.*
