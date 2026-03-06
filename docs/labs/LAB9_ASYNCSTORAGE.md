# Lab: AsyncStorage

## Objective

Add a **Dark Mode** toggle to the Settings screen that persists across app restarts — applying the same `useEffect` + storage pattern you learned in the Week 9 guide, but on your own.

---

## What You Need to Do

Add a new toggle below Notifications on the Settings screen. When the user toggles it on or off, the value should be saved to storage immediately. When the app restarts, the toggle should load and display the last saved value.

---

## Requirements

1. Add a new toggle below Notifications on the Settings screen, using `AppCard` with a `Switch`, titled **"Dark Mode"** with subtitle **"Use dark theme"**
2. Add a new key to `STORAGE_KEYS` in `lib/storage.ts`: `THEME: "theme"`
3. Save the toggle value to storage when it changes (same pattern as `handleToggle` for notifications)
4. Load the saved value on mount (same `useEffect` pattern as notifications)
5. The toggle must persist — if you toggle it on, close the app, and reopen it, it should still be on

---

## Hints

1. You already have the pattern — look at how `notifications` + `handleToggle` work in `settings/index.tsx`. Create `darkMode` + `handleDarkModeToggle` following the exact same pattern.
2. You can load both values in the same `useEffect` — add a second `storage.get` call inside `loadNotifications` and rename it to `loadSettings`.
3. Don't worry about actually changing the app's colors yet — just make the toggle save and load correctly. We'll connect it to theming in a later week.

---

## Bonus

Display a small text indicator below the Dark Mode card that shows the current storage state — something like `"Stored: true"` or `"Stored: false"`. Read it directly from state. This helps you verify that storage is working without having to restart the app every time.

---

## Files to Modify

```
lib/storage.ts                     ← add THEME key to STORAGE_KEYS
app/(tab)/settings/index.tsx       ← add darkMode state, handleDarkModeToggle, load in useEffect
```
