# Performance pass & dependency audit

Recorded from `npm run build` output on this machine, before and after the
changes. Reproduce with `npm run build`.

## 1. The lazy-split decision (hand-written)

`/habits` gets the `React.lazy` + `Suspense` boundary. Measured reasons, not
intuition — per-chunk mapped source from `vite build --sourcemap`:

| Route | App source in its chunk |
| --- | --- |
| `/habits` | **31.0 kB** (17.4 page + 6.9 components + 5.5 hooks + 1.2 lib) |
| `/login` + `/signup` | 6.9 kB |

Three things make `/habits` the right and only worthwhile boundary:

1. **It holds the code.** It is 4.5x the app code of the two auth pages
   combined, and it is the only route reachable after auth, so it is the route
   the entry `<Suspense>` actually gates.
2. **It is the landing route.** `/` redirects to `/habits`
   (`src/App.tsx:15`), so a returning user is already waiting on it. Splitting
   anything *less* commonly seen saves nothing.
3. **The auth pages must not be split.** They are smaller than the
   `react-router` code that renders them. A second boundary there adds a
   sequential round trip to the signed-out first paint — the most common cold
   entry — to save about 2 kB gzip. That is a bad trade, so `SignIn` and
   `SignUp` stay eager.

`AvatarUpload` was also considered and rejected: at 2.5 kB it is already inside
the `/habits` chunk, and a nested boundary there would serialise a second fetch
behind the route chunk for no measurable gain.

The Suspense fallback reuses `LoadingScreen` rather than an inline spinner, so
the route boundary and the auth boundary do not flash two different loaders.

## 2. Chunk sizes: before / after

### Before

```
dist/manifest.webmanifest                             0.51 kB │ gzip:   0.31 kB
dist/index.html                                        0.51 kB │ gzip:   0.31 kB
dist/assets/index-D6uIuTPH.css                        21.51 kB │ gzip:   5.03 kB
dist/assets/workbox-window.prod.es5-Bd17z0YL.js        5.65 kB │ gzip:   2.20 kB
dist/assets/Habits-Cnz4-M89.js                        14.83 kB │ gzip:   4.69 kB
dist/assets/index-Ce6aZorn.js                        455.38 kB │ gzip: 131.35 kB

✓ 86 modules transformed.
PWA v1.3.0  precache 20 entries (545.10 KiB)
```

### After

```
dist/manifest.webmanifest                          0.51 kB
dist/index.html                                     0.84 kB │ gzip:   0.44 kB
dist/assets/index-CkLQunqh.css                     19.80 kB │ gzip:   4.76 kB
dist/assets/workbox-window.prod.es5-Bd17z0YL.js     5.65 kB │ gzip:   2.20 kB
dist/assets/Habits-Chi67nah.js                     15.34 kB │ gzip:   4.88 kB
dist/assets/index-CwOBFgyK.js                     385.81 kB │ gzip: 110.56 kB

✓ 67 modules transformed.
PWA v1.3.0  precache 20 entries (476.32 KiB)
```

### Delta

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Entry chunk, minified | 455.38 kB | 385.81 kB | **−69.57 kB (−15.3%)** |
| Entry chunk, gzip | 131.35 kB | 110.56 kB | **−20.79 kB (−15.8%)** |
| All JS, gzip | 138.24 kB | 117.64 kB | **−20.60 kB (−14.9%)** |
| Service-worker precache | 545.10 KiB | 476.32 KiB | **−68.78 KiB (−12.6%)** |
| Modules transformed | 86 | 67 | −19 |
| CSS, gzip | 5.03 kB | 4.76 kB | −0.27 kB |
| `npm install` packages | 775 | 391 | **−384** |

Nothing moved into a new lazy chunk, which is the point: the bytes came out of
the entry, not out of view.

`src/index.css` pins Tailwind's source set to the web app. `@import "tailwindcss"`
alone auto-detects sources across the whole repository, so once `mobile/` was
scaffolded its NativeWind class names were compiled into the web stylesheet
(19.80 kB → 22.46 kB). `@import "tailwindcss" source(none)` plus explicit
`@source` globs keeps the two apps' class vocabularies separate. The result was
verified by extracting all 157 class tokens referenced from `src/**` and
`index.html` and asserting each is present in the built stylesheet.

## 3. Dependency audit

### Dropped: `expo` (from the web app)

| Evidence | Finding |
| --- | --- |
| `expo` sat in `dependencies`, not `devDependencies` | It is a runtime dependency of a bundle that never imports it |
| Zero imports of `expo` / `expo-*` / `react-native` in `src/` | Nothing in the web app used it |
| `tsconfig.json` had `extends: "expo/tsconfig.base"` | Pulled React Native compiler options into a DOM-only Vite project |
| `package.json` had `"main": "src/App.tsx"` | Expo entrypoint declaration on a Vite project — the reason `npx expo start` hijacked web bundling and failed on `virtual:pwa-register/react` |

Effect: 384 fewer packages installed, and the "Web Bundling failed / Unable to
resolve `virtual:pwa-register/react`" failure goes away because Metro is no
longer in the picture. The Expo app is now a separate project with its own
`package.json` (see `mobile/`), which is where that dependency belongs.

One trap worth recording: `npx expo install` run from `mobile/` silently injected
`"expo": "^46.0.21"` into the **root** `package.json`, which re-poisoned the root
lockfile with 500+ Expo packages and recreated the original failure by a
different route. `expo export` does not do this, only `expo install`. If the root
manifest ever gains an `expo` entry again, that command is the cause.

### Replaced: `@supabase/supabase-js` → its three used sub-clients

`createClient` from `@supabase/supabase-js` returns a `SupabaseClient` whose
constructor *unconditionally* builds a `RealtimeClient` and exposes a
`FunctionsClient`. This app calls neither — `grep` for `.channel(`,
`functions.invoke` and `rpc(` across `src/` returns nothing. Both, plus the
Phoenix websocket transport they pull in, were being downloaded, parsed and
instantiated on every route.

Measured, from the sourcemap of each build:

| Package | Before | After |
| --- | --- | --- |
| `@supabase/realtime-js` | 99.7 kB | **gone** |
| `@supabase/phoenix` | 54.9 kB | **gone** |
| `@supabase/functions-js` | 16.6 kB | **gone** |
| `@supabase/supabase-js` | 38.6 kB | **gone** |
| `src/lib/supabaseClient.ts` (new) | — | +3.9 kB |
| **Net** | | **−205.9 kB of source** |

Kept, and why:

- `@supabase/auth-js` (423.0 kB) — sign-in, session, `onAuthStateChange`.
- `@supabase/postgrest-js` (108.6 kB) — every `.from()` query.
- `@supabase/storage-js` (113.1 kB) — avatar upload. It transitively imports
  `iceberg-js` (16.8 kB) for its analytics API, which we do not use, but it is a
  static import inside `storage-js` and not separable without patching the
  package. Left in place deliberately.
- `react-router` (366.8 kB) — see below.

`src/lib/supabaseClient.ts` reimplements the wiring, and the auth part is copied
from `supabase-js`'s own `fetchWithAuth`: `apikey` is the anon/publishable key,
and `Authorization` is resolved **per request** from the live session, falling
back to the key itself when signed out. The session `storageKey` is deliberately
the same default (`sb-<project-ref>-auth-token`) so sessions persisted by the
previous build survive the swap. `from` is taken from the real `PostgrestClient`
via `Object.assign` rather than re-declared, so its overloads and per-table
generics are unchanged.

### Considered and rejected: replacing `react-router-dom`

`react-router` is 366.8 kB of mapped source — the second largest item in the
bundle after `react-dom`, and the app uses only the declarative half
(`BrowserRouter`, `Routes`, `Route`, `Navigate`, `Outlet`, `Link`,
`useLocation`, `useNavigate`). The data-router half (loaders, actions,
fetchers) is dead weight. Swapping in a ~2 kB router would plausibly save
30–40 kB gzip, which is larger than everything above combined.

Rejected because `ProtectedRoute` is built on `Outlet` + nested routes and
`ProtectedRoute` owns the post-auth redirect with `state.from`; porting that to
a different router is a behavioural rewrite of the auth gate, not a bundle tweak,
and this pass is not the place to take that risk. It is the obvious next
performance lever if the router ever needs replacing for another reason.

## 4. Verification

`scripts/verify-supabase-client.ts` exercises the composed client against the
real project without writing rows or creating users. Each assertion checks for
the *expected server-side rejection*, which can only occur if the request
reached the right endpoint with a valid `apikey`:

```
node --experimental-strip-types scripts/verify-supabase-client.ts

auth.signInWithPassword  -> "Invalid login credentials"   (not a transport error)
from("habits").select()  -> data=[] error=""              (RLS filtered, not bounced)
storage.from("avatars").list() -> data=[] error=""        (exercises the authed fetch we inject)
auth.getSession()        -> session=null error=null
```

That covers the three endpoints and the header logic, but it does **not** prove
an authenticated write. First real sign-in on the deployed URL is still the
actual test of that path.

## 5. Environment variables

The credential is now read as `VITE_SUPABASE_ANON_KEY`, with
`VITE_SUPABASE_PUBLISHABLE_KEY` kept as a fallback so existing local `.env`
files keep working. `VITE_SUPABASE_PUBLISHABLE_KEY` is the newer Supabase name
for the same publishable/anon key; the Vercel dashboard name in the brief is
`VITE_SUPABASE_ANON_KEY`, so that is the primary. `.env` is gitignored, and
`.env.example` documents the two names with no values.

The Expo app uses the `EXPO_PUBLIC_` prefix, which is also inlined into the
bundle in cleartext. That is the same anon key, not a secret, but it is the one
behavioural difference between the two `.env` files and the reason a value
cannot simply be copied between them.

## 6. The Expo port

### What is shared, and what is not

| Module | Shared | Notes |
| --- | --- | --- |
| `src/lib/types.ts` | yes | Supabase generated `Database` types |
| `src/lib/supabaseClient.ts` | yes | Composed client, framework-free on purpose |
| `src/lib/habitQueries.ts` | yes | All `.from()` calls; extracted from `useHabits` for this |
| `src/hooks/useHabits.ts` | no | React state over the queries; thin, but RN-specific enough to keep local |
| `src/lib/supabase.ts` | no | Storage adapter: `localStorage` vs AsyncStorage + PKCE |
| Tailwind class strings | yes | Same tokens, two engines (v4 CSS-first vs v3 config) |
| Share | no | **The only deliberate divergence** |

Metro reaches across the tree via `watchFolders` + `nodeModulesPaths` in
`mobile/metro.config.js`. Four things had to be true for the shared imports to
bundle, each found by a failed export rather than by reading docs:

1. `watchFolders` must include the root `node_modules`, not just the root `src`.
   Metro will not consider files under a directory it does not watch.
2. `nodeModulesPaths` alone is insufficient. The requiring file sits outside
   `projectRoot`, so Metro's walk-up never reaches the root tree from it. The
   `@supabase` scope has to be pinned explicitly with `extraNodeModules`.
3. `unstable_enablePackageExports` must be **off**. `@supabase/auth-js` and its
   siblings publish no `exports` field, only `main`, and the package-exports
   resolver finds nothing.
4. `disableHierarchicalLookup` must stay **off**. npm nests some of Expo's own
   dependencies under `node_modules/expo/node_modules` instead of hoisting them
   (`expo-asset`, `expo-constants`), and only the walk-up from the importing
   file finds those. Disabling it looks like a monorepo hardening measure and is
   exactly what breaks the build.
   `babel-preset-expo` was likewise nested, and must be a direct devDependency
   so Babel can resolve it relative to the config file.

`mobile/` does not install its own copy of `@supabase/*`; the shared factory
resolves the single set the web app already has, which rules out two live
instances of the auth client.

### The one platform branch

`Platform` is referenced in exactly one file, `mobile/src/lib/share.ts`, as a
single `Platform.select` resolved once at module scope:

- `navigator.share` on web, `Share.share` on native.
- The web arm is unreachable on native, and is additionally guarded with
  `typeof nav?.share !== 'function'` because the Web Share API is missing on
  desktop browsers and older mobile Safari and would otherwise throw a
  `TypeError` on tap.
- Called from one place: `HabitListScreen.tsx`.

`SignInScreen` and `AddHabitScreen` originally branched on `Platform.OS` to set
`KeyboardAvoidingView`'s `behavior`. That prop is removed rather than kept:
`behavior` only has an effect on iOS, and Android already resizes via
`adjustResize`, so the framework default gives correct behaviour on both
platforms with one code path. `Alert.alert` replaces `window.confirm` outright
rather than branching, since `Alert` exists on every platform Expo targets.

An audit of `mobile/src` for `navigator`, `window.`, `document.`, `localStorage`
and bare `fetch(` returns no unguarded use: the only hit is the `globalThis
.navigator` read inside the web arm above.

### Verification

```
cd mobile
npx tsc --noEmit                        # exit 0
npx expo export --platform android --output-dir .export-test --clear
```

```
Android Bundled 19431ms index.ts (1251 modules)
android bundles (1):
_expo/static/js/android/index-*.hbc (3.37 MB)
```

The 1251 modules include the shared factory: the exported Hermes bundle was
searched for `createSupabaseClient` and for the `auth/v1`, `rest/v1` and
`storage/v1` route strings, all present. That is the evidence that the web
app's data layer actually made it into the native bundle rather than being
stubbed or tree-shaken.

Not yet verified, because both need hardware: `npx expo start` on a device, and
an authenticated sign-in against the live project. The 3.37 MB figure is
pre-`--dev`, un-minified-equivalent Hermes bytecode and is not a release size;
a production EAS build would be substantially smaller.
