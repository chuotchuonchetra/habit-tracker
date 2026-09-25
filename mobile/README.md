# Habit Tracker — Expo app

The React Native half of the habit tracker. It is a separate npm project from the
Vite web app in the repository root on purpose: Metro and Vite must never share
a dependency tree here.

## Run it

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` for an Android emulator.

Requires the `.env` file. Copy `.env.example` to `.env` and fill in the two
values — they are the same anon key the web app uses, under the `EXPO_PUBLIC_`
prefix that Expo inlines into the bundle.

```bash
cp .env.example .env     # or: Copy-Item .env.example .env
```

## Verify without a device

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir .export-test --clear
```

The export must report `Android Bundled` and emit a `.hbc` under
`.export-test/_expo/static/js/android/`. If it fails to resolve
`@supabase/auth-js` or `expo-asset`, `metro.config.js` has been altered in one of
the four ways documented in `../docs/performance-pass.md` §6.

Delete `.export-test` afterwards; it is gitignored.

## How this shares code with the web app

`../src/lib/types.ts`, `../src/lib/supabaseClient.ts` and
`../src/lib/habitQueries.ts` are imported directly by relative path, resolved
through `watchFolders` in `metro.config.js`. They are not copied, so a fix
lands in both apps at once. This app does not install its own `@supabase/*`
packages — the shared factory resolves the root copy, which keeps a single auth
client instance at runtime.

`src/lib/share.ts` is the only file that knows which platform it is on. See
`../docs/performance-pass.md` §6 for the reasoning and the Metro resolution
requirements.

## Layout

```
App.tsx                     stylesheet + providers
index.ts                    entry point
src/navigation.tsx          auth gate, List -> Add stack
src/lib/supabase.ts         AsyncStorage + PKCE adapter
src/lib/share.ts            the platform branch
src/hooks/useAuth.tsx       session, AppState refresh
src/hooks/useHabits.ts      habit state over the shared queries
src/context/HabitsContext   list/add state
src/screens/                SignIn, HabitList, AddHabit
```

## Not verified

`npx expo start` on a device, and an authenticated sign-in, both need hardware.
Run them before trusting this port in front of a user.
