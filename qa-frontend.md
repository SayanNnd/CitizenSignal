# qa-frontend.md — Frontend decision log (Track B)

Append-only. One entry per task, newest at the bottom. Only Track B writes here. Rules are in `agents.md` ("Decision log").
Use this file to answer judges' "why did you do it this way?" questions about the app.

## Entry template

```
### <short task name> — <HH:MM>
- **Task:** what was asked
- **Decision:** what we chose, and where it lives (file/component)
- **Why:** reason, and the alternative we rejected
- **Why it's good:** concrete benefit
- **Fallbacks / limits:** weaknesses, shortcuts, what we'd do with more time
```

---

## Entries

### Frontend decisions locked at kickoff — 11:45
- **Task:** Agree the app design before coding.
- **Decision:** Android-only Expo Go client; browsing and reporting open to everyone, login (Supabase email + password) required only to upvote; mock data behind `EXPO_PUBLIC_USE_MOCK` so screens can be built before the API exists; photo shrunk with `expo-image-manipulator` before upload.
- **Why:** Lets the frontend work in parallel with the backend and keeps the demo path short. Rejected: iOS support (HEIC and extra testing), social login or magic links (deep-link pain in Expo Go), requiring login before reporting (adds friction to the main flow).
- **Why it's good:** Anyone can try the app instantly; the upvote login gate still gives one vote per account; smaller uploads are faster on venue Wi-Fi.
- **Fallbacks / limits:** No iOS support; mock data must be kept in sync with the real contract by hand; confirming a possible duplicate re-uploads the photo.

- **[ALL] 13:45 (from Track A):** Contract §4 updated — added `GET /api/issues/mine` (requireAuth, returns `MyIssue` = Issue + `my_role`), and optional `q`, `category`, `status` filters on `GET /api/issues`; `radius_m` is capped at 20000.

### UI rebuild, comments, theming, offline mock (catch-up entry, written retroactively) — 14:10
- **Task:** Turn the wireframe `mock1.jpeg` into the app, then polish it: no emojis, a distinctive look, comments on issues, a light/dark toggle, a compass instead of the satellite button, and a mock-only mode so the UI could be reviewed before the backend was ready.
- **Decision:** One map-first home screen (`app/index.tsx`) with a draggable `IssueSheet`, a left `MenuDrawer` and a separate `search` screen, as in the mock. Icons are drawn from plain Views in `src/components/Icon.tsx`. Theme is `src/theme/ThemeProvider.tsx` (Light / Dark / System, saved on the device). Mock mode is the default (`src/lib/env.ts`) and `src/api/mock.ts` imitates the matching outcomes, upvotes, comments and `/mine`.
- **Why:** Hand-built View icons and `PanResponder` instead of an icon package or bottom-sheet library, because `agents.md` forbids new UI libraries. Mock-by-default instead of a missing `.env` crashing the app (a Supabase client created with no URL threw at import time).
- **Why it's good:** The whole demo path (report, duplicate sheet, reopen, upvote gate, comments) can be shown without a backend; one theme object means dark mode needs no per-screen code.
- **Fallbacks / limits:** Icons are approximations (not pixel-perfect). Comments (`GET/POST /issues/:id/comments`) are **not in the contract yet**, so with the mock off the discussion shows an error state. Search filters nearby issues in the app rather than using the server's `q`. Nothing here has been run on a physical phone yet.

### Google login, `/mine`, backend behaviour changes — 14:10
- **Task:** Add "Continue with Google", use the new `GET /issues/mine`, and follow the backend's report/validation changes. Also remove "no social login" from `roadmap.md` §1 and `agents.md`.
- **Decision:** `src/auth/google.ts` runs the browser OAuth flow (`signInWithOAuth` with `skipBrowserRedirect`, `expo-web-browser`, then `setSession`, or `exchangeCodeForSession` if a `code` comes back). Email + password stays on `/login` as the fallback. An upvote tapped while logged out is remembered and completed when the user returns signed in (`app/issue/[id].tsx`). `MyIssue` / `my_role` are in `src/types`, and Your Issues shows REPORTER / CONTRIBUTOR and handles a 401. Report submit is blocked until there is a real location, and photo errors from the server appear under the photo. The radius is clamped to 20000 (`src/constants/limits.ts`).
- **Why:** Browser OAuth instead of `@react-native-google-signin` (needs a dev build, will not run in Expo Go). I parse the redirect URL myself instead of importing `expo-auth-session/build/QueryParams`, because that deep path is blocked by the package's `exports` map in this SDK. Rejected: keeping Google as the only login (a flaky venue network would break the demo).
- **Why it's good:** Matches the backend's contract exactly and needs no server change; the upvote completes without a second tap; the fallback login keeps the demo alive.
- **Fallbacks / limits:** Google only works for Gmail accounts added as test users (consent screen is in Testing mode); the redirect may misbehave on some networks. In mock mode the Google button signs in a fake user. `/mine` and the save paths (created, merged, reopened, photo upload) are untested against the real backend, as the backend noted. Docs changed: `roadmap.md` §1 and §2, `agents.md` out-of-scope and login convention (the §4 contract was not changed).

### Google-only login, real auth independent of mock data — 14:45
- **Task:** Remove email login; fix "Continue with Google" signing in instantly without asking for an account.
- **Decision:** `/login` now has only the Google button (plus "Not now"). `src/lib/env.ts` adds `USE_MOCK_AUTH` (true only when no Supabase URL/key is set), and `AuthProvider` uses it instead of `USE_MOCK`. The OAuth call passes `prompt: 'select_account'` (`src/auth/google.ts`).
- **Why:** The instant sign-in was our own mock: `EXPO_PUBLIC_USE_MOCK=true` faked the Google login. Tying auth to the data-mock flag was the mistake; rejected: telling people to flip the flag, since that also switches off the mock data they may still want. `select_account` forces Google's chooser even if the browser already has a Google session.
- **Why it's good:** Real Google login works with mock data, so login can be tested before the backend is ready; the account picker always appears, which also makes demos with several test accounts easier.
- **Fallbacks / limits:** With email removed there is no fallback if Google or the redirect fails on venue Wi-Fi (a tunnel URL for the redirect would be the fix). Only Gmail test users can sign in while the consent screen is in Testing mode. Not yet run on a phone.

### Google sign-in lands on "localhost" (diagnosis) — 15:05
- **Task:** Find out why Google sign-in showed a localhost page.
- **Decision:** No app logic change; added a dev-only log of the redirect URL in `src/auth/google.ts`. Checked Supabase directly: Google is enabled and `/auth/v1/authorize` correctly redirects to accounts.google.com, so the failure is on the return leg (Supabase falling back to its Site URL, default `http://localhost:3000`).
- **Why:** The app-side flow matches Supabase's Expo guide; the fallback to Site URL is a Supabase project setting the backend track owns.
- **Why it's good:** Gives the backend the exact URL to allow-list instead of guessing.
- **Fallbacks / limits:** Not confirmed until the backend checks Redirect URLs and the Google provider secret; the log only appears in dev builds (Metro terminal).

### X-style feed, open-only issues, no status text — 15:40
- **Task:** Make posts full-width like X, use small corner radii, show only open issues, remove OPEN/RESOLVED and "returned" text and other jargon, show every report date and fix date in the timeline, smooth the compass.
- **Decision:** `IssueCard` is now a full-width post (round category avatar, header, text, photo, counts, hairline divider); the issue screen and comments follow the same pattern. `radius` tokens in `src/constants/theme.ts` shrank to 3/4/6/10. `useIssues` always sends `status=open` (an existing contract filter), so fixed issues never reach the map, feed or search. The timeline merges the first report, every evidence row and `resolved_at`. `CompassButton` animates along the shortest arc, and the map now reads the heading during the gesture (`onRegionChange`, one request at a time).
- **Why:** Filtering on the server instead of hiding rows in the app keeps counts and the map consistent. Showing reports in the timeline replaces the separate evidence list, which said the same thing twice.
- **Why it's good:** Less to read per screen and no internal vocabulary (case numbers, statuses, recurrence) shown to users; compass no longer jumps.
- **Fallbacks / limits:** The API stores only the latest fix date (`resolved_at`), so an issue fixed twice shows one "Fixed" entry; full history needs a backend change. Demo step 2 in `roadmap.md` §9 ("open a resolved pothole") can no longer be done from the map, though the reopen flow still works through "Is this the same issue?". Not yet run on a phone.
