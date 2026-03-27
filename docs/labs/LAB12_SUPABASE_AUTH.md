# Lab 12: Supabase Auth

## Objective

Extend the events feature you built in Labs 10 and 11 with a full auth layer. Users must sign in before they can see events. Event organizers are identified by the signed-in user's account. You'll apply the same `AuthContext`, `AuthGuard`, login/signup patterns from the Week 12 guide to a new area of the app.

---

## What You Already Have

After completing the Week 12 guide, your app has:

- **Supabase client** (`lib/supabase.ts`) — configured with AsyncStorage persistence
- **`AuthContext`** — `AuthProvider`, `useAuth()`, `signIn`, `signUp`, `signOut`
- **Login screen** (`app/login.tsx`) — RHF + Zod, auth error banner
- **Sign-up screen** (`app/signup.tsx`) — cross-field Zod validation, email confirmation handling
- **`AuthGuard`** in `_layout.tsx` — all tabs protected
- **Events feature** (from Labs 10 + 11) — events list, event detail, cover photo, event location map

You will be **adding auth to the events feature** and **extending the events detail screen to show the signed-in user's identity**.

---

## Scenario

The student association app is going live. Before that happens, the development lead (you) has been asked to:

1. **Verify that all events routes are protected** — only signed-in students can see events
2. **Show the signed-in user on the event detail screen** — so organizers know who is viewing
3. **Conditionally show the "Add Photo" button** — only the signed-in user should be able to add/change the cover photo (we'll simulate this with a simple owner check)
4. **Add a "My Events" section to the Home screen** — show how `user.id` can be used as a data filter

---

## Expected File Changes

```
MODIFIED:  app/(tab)/events/_layout.tsx       <-- confirm events stack is inside (tab), already protected
MODIFIED:  app/(tab)/events/[id].tsx          <-- show signed-in user's name; conditional photo edit
NEW:       app/(tab)/events/create.tsx        <-- create-event form (protected, uses useAuth)
MODIFIED:  app/(tab)/events/_layout.tsx       <-- add Create screen to the Stack
MODIFIED:  app/(tab)/home.tsx                 <-- add a "Posted by you" section using user.id
```

---

## Tasks

### Task 1: Verify Route Protection (10 marks)

#### 1a. Confirm `AuthGuard` covers events (5 marks)

The events route lives inside `(tab)/events/`. Because `AuthGuard` in `_layout.tsx` protects everything inside `(tab)`, events are already protected. However, you need to verify this.

**Test (5 marks):**

1. Sign out of the app
2. Use the Expo dev menu (shake device or Cmd+D in simulator) → "Open URL" → type `/(tab)/events`
3. Confirm you are redirected to `/login`, not the events list

Include a screenshot of the redirect in your submission, **or** describe in a comment in `AuthContext.tsx` exactly which line of `AuthGuard` triggers the redirect and why.

#### 1b. Add the signed-in user's email to the events list header (5 marks)

In `app/(tab)/events/index.tsx`, below the page title, add a small text showing the signed-in user's email:

```tsx
const { user } = useAuth();
// ...
{user?.email && (
  <Text style={styles.userInfo}>Viewing as {user.email}</Text>
)}
```

**Style requirement:** The text should use `theme.colors.muted` and `fontSize: 13`. It should appear between the page title and the first event card.

---

### Task 2: Show User Info on Event Detail (20 marks)

Modify `app/(tab)/events/[id].tsx`.

#### 2a. Display the viewer's identity (10 marks)

Below the event title (or in a new "Viewer" section), show an `AppCard` with:

- **title:** `"Viewing as"`
- **subtitle:** the signed-in user's email
- **right:** `<Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />`

This simulates the real-world pattern where a detail screen shows the current user's context (important for audit trails, analytics, and personalisation in production apps).

#### 2b. Conditional photo editing (10 marks)

Currently, any user can tap the cover photo to change it. In a real app, only the event creator should be able to edit photos. Simulate this with a hardcoded `ORGANIZER_ID`.

**Step 1:** Add an `organizerId` field to the `EventDetail` type in `lib/api.ts`:

```ts
type EventDetail = Event & {
  description: string;
  organizer: string;
  capacity: string;
  announcements: string[];
  coordinate: { latitude: number; longitude: number };
  organizerId: string;   // ← ADD THIS (the user ID of the event creator)
};
```

**Step 2:** In `EVENT_DETAILS`, set `organizerId` to the UUID of your own Supabase user. You can find your UUID in the Supabase dashboard → Authentication → Users → your account's `UID` column.

**Step 3:** In `app/(tab)/events/[id].tsx`, get the current user:

```tsx
const { user } = useAuth();
const isOrganizer = user?.id === event?.organizerId;
```

**Step 4:** Only show the cover photo as tappable (showing the camera picker) if `isOrganizer` is true:

- `isOrganizer = true`: `Pressable` wraps the cover photo or placeholder (existing behaviour)
- `isOrganizer = false`: Replace the `Pressable` with a plain `View` — photo is read-only

**Hint:** Use a ternary:
```tsx
const CoverPhotoWrapper = isOrganizer ? Pressable : View;
```

Then use `<CoverPhotoWrapper onPress={isOrganizer ? handlePhotoPress : undefined}>`.

---

### Task 3: Create Event Form (40 marks)

Build a "Create Event" screen that is protected by auth and pre-fills the organizer's email.

#### 3a. Navigation setup (5 marks)

Add a `create` screen to the events Stack in `app/(tab)/events/_layout.tsx`:

```tsx
<Stack.Screen name="create" options={{ title: "New Event" }} />
```

Add a "New Event" button to the events list header that navigates to this screen:

```tsx
<Pressable onPress={() => router.push("/(tab)/events/create")}>
  <Ionicons name="add-circle-outline" size={26} color={theme.colors.primary} />
</Pressable>
```

Place this button in the header area (a `flexDirection: "row"` `View` alongside the title, with `justifyContent: "space-between"`).

#### 3b. Create the form (35 marks)

Create `app/(tab)/events/create.tsx`.

**Schema (10 marks):**

Use React Hook Form + Zod. The schema must validate:

```ts
const createEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  date: z.string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
  time: z.string()
    .trim()
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i, "Time must be in HH:MM AM/PM format."),
  location: z.string().trim().min(2, "Location is required."),
  description: z.string().trim().min(10, "Description must be at least 10 characters."),
});
```

**Pre-filled organizer field (5 marks):**

Add a **read-only** organizer field above the title that shows the signed-in user's email. This field does **not** need to be part of the Zod schema — it's display only.

```tsx
const { user } = useAuth();
// ...
<Text style={styles.label}>Organizer</Text>
<View style={styles.readOnlyField}>
  <Text style={styles.readOnlyText}>{user?.email}</Text>
</View>
```

Style `readOnlyField` with a different background (e.g., `theme.colors.bg`, `borderColor: theme.colors.border`) to signal it's not editable. The field must be visually distinct from the editable inputs.

**Form fields (10 marks):**

Include all 5 fields from the schema: Title, Date, Time, Location, Description. Each must:
- Have a `Controller` from React Hook Form
- Show a validation error message if the field fails validation
- Apply `styles.inputError` border when invalid

The Description field should use `multiline={true}` and `numberOfLines={4}` on the `TextInput`.

**Submit handler (10 marks):**

On submit, the form should:
1. Run Zod validation (via `handleSubmit`)
2. Simulate saving to an API (use a `delay(1000)` like `lib/api.ts` does — no real API call needed)
3. Show an `ActivityIndicator` inside the submit button while the delay runs (`isSubmitting` state)
4. After success, navigate back to the events list: `router.replace("/(tab)/events")`

The saved event does not need to persist — it's a mock submission. The goal is the form validation pattern, not data persistence (that comes in Week 13).

---

### Task 4: "My Events" on Home Screen (20 marks)

Modify `app/(tab)/home.tsx` to add a "My Events" section.

#### 4a. Filter events by organizer (10 marks)

In `lib/api.ts`, add an `organizerId` field to the base `Event` type (same value as in Task 2 above — your user UUID):

```ts
export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  organizerId: string;   // ← ADD THIS
};
```

Update the `EVENTS` mock data to include your `organizerId` on at least one event and a different (fake) UUID on the others.

Add a new API function:

```ts
export const getEventsByOrganizer = async (userId: string): Promise<Event[]> => {
  await delay();
  maybeThrow();
  return EVENTS.filter((e) => e.organizerId === userId);
};
```

#### 4b. Show "My Events" section (10 marks)

In `app/(tab)/home.tsx`:

1. Get the current user: `const { user } = useAuth()`
2. Add a second `useEffect` that calls `api.getEventsByOrganizer(user.id)` when the component mounts
3. Handle loading and error states separately from the dashboard data
4. Show the results as `AppCard` components in a "My Events" section below the existing dashboard cards

**Display requirements:**
- Section title: "My Events" (same `sectionTitle` style as the courses or map building list)
- If there are no events: show "You haven't created any events yet." in `theme.colors.muted`
- If there are events: one `AppCard` per event with the event title and date as subtitle
- Loading and error states for this section should be independent of the dashboard loading state (dashboard can show while events are still loading)

---

## Submission Requirements

Submit the following files:

1. `lib/api.ts` — Updated with `organizerId` fields on `Event` and `EventDetail`, and `getEventsByOrganizer` function
2. `app/(tab)/events/index.tsx` — Updated with user email in header
3. `app/(tab)/events/[id].tsx` — Updated with viewer identity card and conditional photo editing
4. `app/(tab)/events/_layout.tsx` — Updated with `create` screen
5. `app/(tab)/events/create.tsx` — New create-event form
6. `app/(tab)/home.tsx` — Updated with "My Events" section

---

## Rubric

| Task | Criteria | Marks |
|------|----------|-------|
| **Task 1: Route Protection** | | **10** |
| | Evidence of `AuthGuard` redirect (screenshot or code comment) | 5 |
| | User email shown in events list header | 5 |
| **Task 2: User Info on Event Detail** | | **20** |
| | "Viewing as" `AppCard` shown with correct user email | 10 |
| | `organizerId` field added to type + mock data | 3 |
| | `isOrganizer` logic correctly computed | 4 |
| | Cover photo is non-interactive (plain `View`) when not the organizer | 3 |
| **Task 3: Create Event Form** | | **40** |
| | `create` screen in `_layout.tsx` + "New Event" navigation button | 5 |
| | Zod schema validates all 5 fields with correct rules | 10 |
| | Read-only organizer field shows signed-in user's email | 5 |
| | All 5 form fields with error display | 10 |
| | Submit shows `ActivityIndicator`, navigates after success | 10 |
| **Task 4: My Events** | | **20** |
| | `organizerId` on `Event` type + `getEventsByOrganizer` function | 10 |
| | "My Events" section renders with correct data and empty state | 10 |
| | | **Total: 90** |

---

## Hints

1. **Finding your Supabase UUID:** Dashboard → Authentication → Users → click your user → the `User UID` is a UUID like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. Copy it. Set it as `organizerId` on at least one mock event.

2. **The conditional wrapper pattern:** Instead of duplicating JSX for the pressable vs non-pressable cover photo:
   ```tsx
   const PhotoWrapper = isOrganizer ? Pressable : View;
   // Then:
   <PhotoWrapper onPress={isOrganizer ? handlePhotoPress : undefined} style={...}>
     {/* cover photo JSX */}
   </PhotoWrapper>
   ```
   TypeScript may complain about the union type — cast it: `const PhotoWrapper = (isOrganizer ? Pressable : View) as React.ComponentType<any>`.

3. **Read-only field style:** Make it visually distinct to communicate to users that this field can't be edited:
   ```ts
   readOnlyField: {
     backgroundColor: theme.colors.bg,
     borderWidth: 1,
     borderColor: theme.colors.border,
     borderRadius: theme.radius.input,
     padding: 14,
   },
   readOnlyText: {
     fontSize: 16,
     color: theme.colors.muted,
   },
   ```

4. **Multiline description field:**
   ```tsx
   <TextInput
     style={[styles.input, styles.textArea, errors.description && styles.inputError]}
     multiline
     numberOfLines={4}
     textAlignVertical="top"  // Android: start text at the top
     placeholder="Describe the event..."
     placeholderTextColor={theme.colors.muted}
     value={value}
     onChangeText={onChange}
   />
   ```
   Add a `textArea` style with a fixed height: `{ height: 100 }`.

5. **Date regex explanation:** `^\d{4}-\d{2}-\d{2}$` means: exactly 4 digits, a dash, 2 digits, a dash, 2 digits. "2026-03-26" passes. "March 26" fails. This is strict format validation — useful for dates that will eventually go into a database.

6. **Independent loading states for "My Events":** Don't reuse `isLoading` from the dashboard. Add separate state:
   ```ts
   const [myEvents, setMyEvents] = useState<Event[]>([]);
   const [isLoadingEvents, setIsLoadingEvents] = useState(true);
   ```
   This way the dashboard cards show while "My Events" is still loading.

7. **Simulating the API delay in `create.tsx`:** Import the delay function or replicate it:
   ```ts
   const delay = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
   // In onSubmit:
   await delay();
   router.replace("/(tab)/events");
   ```

8. **`user.id` vs `user.email`:** Use `user.id` (the UUID) as the `organizerId` — not `user.email`. Emails can change. UUIDs are permanent. This is the same reason databases use numeric IDs rather than names as foreign keys.

---

*This lab applies the Week 12 auth patterns to a real feature: ownership, identity display, and protected creation. The conditional photo edit simulates production-grade permission checks. The create-event form is identical in structure to the profile form — Zod schema, Controllers, error messages, submit handler — showing that the form pattern from Week 8 scales to any form in any context.*
