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

### Headline-first posts, photo hero, severity triangle — 16:05
- **Task:** Posts read as if the category was a person talking; make the issue screen show a big photo on top with a big title and short description; replace the priority bars with a small triangle coloured by severity.
- **Decision:** `IssueCard` dropped the avatar; each post is a coloured category line (icon, name, time, triangle), a bold headline, two lines of description, the photo and counts. The headline is the API title without its "<Category>:" prefix (`displayTitle` in `src/lib/format.ts`). The issue screen opens with a 300px photo (or a tinted category illustration when there is no photo), then the headline, description and a "High priority" style label. `SeverityTriangle` replaces `PriorityMeter`; low/medium/high colours are `severityLow/Medium/High` in both palettes in `src/constants/theme.ts`.
- **Why:** A name-plus-avatar header is what made it feel like the category was the author; a headline matches what a civic report is. Severity uses the same 1–5 priority scale as before, collapsed to three colours, instead of a new formula.
- **Why it's good:** Faster to scan; the most important words come first; the severity colours can be tuned in one file.
- **Fallbacks / limits:** Headlines come from the first words of the description (backend-generated), so title and description can overlap. Severity thresholds (levels 1–2 low, 3 medium, 4–5 high) are guesses until real data is in. Not yet run on a phone.

### [ALL] Contract change: comments + `comment_count`
- `roadmap.md` §4 now defines `GET/POST /issues/:id/comments` (Comment: `id, issue_id, author, body, created_at, is_mine`), and every Issue has `comment_count`. Frontend types updated to match (both fields now required).

### Coherence fixes: reopen visible again, comments live, root scaffold removed
- **Task:** Fix the gaps found in a frontend/backend coherence audit.
- **Decision:** (1) Reopen is visible again without bringing fixed issues back onto the map: a separate "It came back" alert after reporting (`app/report.tsx`), a "Came back after being fixed" / "Came back N times…" line on cards and the issue screen (`recurrenceLabel` in `src/lib/format.ts`), and a "Came back" timeline entry from `reopened_at`. (2) Comments now hit a real backend endpoint; `comment_count`/`is_mine` are required in `src/types`, and the mock sets `is_mine: false` on seeded comments. (3) The "use email" hint was removed from the Google sign-in error. (4) The `create-expo-app` template at the repo root (`package.json`, `app.json`, `src/`, `assets/`, `scripts/`) was deleted; `frontend/` is the only app. Also ran `npm install` (the `expo-auth-session` package was declared but not installed, so `tsc` failed).
- **Why:** The reopen is the pitch's headline, but the earlier jargon cleanup made merge and reopen look identical. Showing fixed issues on the map again was the other option, rejected to keep the "open issues only" decision. The plain wording ("came back") keeps that cleanup's spirit.
- **Why it's good:** Demo steps 2–3 (`roadmap.md` §9, updated) work again. `tsc --noEmit` is clean and the frontend lockfile is unchanged.
- **Fallbacks / limits:** Not run on a phone. Search still filters loaded issues in the app instead of using the server's `q`; that was kept on purpose (instant results, also matches category names). `.env` still has `EXPO_PUBLIC_USE_MOCK=true`; flip it after the comments SQL has been run in Supabase.

### Smooth sheet buttons, location-first loading, X-style menu, sonar logo — 16:40
- **Task:** Fix the compass and location buttons flying in from the top when dragging the sheet down; stop issues loading jankily on the map; make the menu look like X's; animate the menu logo like sonar; use one font for the "N nearby · 2 km" line.
- **Decision:** The buttons are now passed into `IssueSheet` (`floating` prop) and share the sheet's `translateY`, fading out near the top instead of unmounting. `LocationProvider` exposes `ready`: it uses the phone's last known fix first (instant), only moves the area if a fresh fix is more than 300 m away, and gives up waiting after 6 s. The map mounts only once `ready`, and `useIssues` waits for it and keeps the previous list visible while a new one loads (`placeholderData: keepPreviousData`). `MenuDrawer` uses plain icon + label rows with Log out at the bottom; `SignalMark` gained an `animated` sonar mode (three staggered rings, native driver).
- **Why:** The jump came from the buttons remounting at a position computed from the previous sheet height. The janky load came from fetching the fallback city (New Delhi) first, then refetching and flying the map once GPS arrived. Rejected: keeping the buttons outside the sheet and animating them separately (two animations to keep in sync); rendering them outside the sheet's bounds (Android won't deliver touches there).
- **Why it's good:** One animation drives sheet and buttons, so they can't drift apart; the first request already uses the right place, so the map and list appear once instead of twice.
- **Fallbacks / limits:** If GPS takes over 6 s the app falls back to the default city and may move once when the fix arrives. A stale last-known fix under 300 m away is kept as-is. Not yet run on a phone.

### Light map style, X-style search, map follows picked place — 17:05
- **Task:** Map stayed dark after switching to light mode; make search look like the feed (X style); picking a location changed the list but not the map.
- **Decision:** Light mode passes `LIGHT_MAP_STYLE = []` (`src/constants/mapStyle.ts`) instead of `undefined`. Search has the input at the top with a back arrow, flat bold "Locations" / "Issues" headers that still fold away, and full-width rows with dividers (issues reuse `IssueCard`). The home screen computes one camera target (focused issue, else selected area) and only moves the camera while it is focused (`useIsFocused`), catching up 350 ms after returning; "my location" forces a move with a counter.
- **Why:** Checked the Android source of react-native-maps: `setMapStyle(null)` is a no-op, so the dark style stayed; an empty JSON list resets to Google's default. Camera moves sent while the search screen covered the map were dropped, because the hidden map's native view is detached. Rejected: remounting the map with a new `key` on theme change (loses the user's camera position).
- **Why it's good:** Theme switches are instant and keep the camera; the map always ends up on what the user picked, whichever screen they picked it from.
- **Fallbacks / limits:** The 350 ms wait is tuned to the default stack animation; a slower device could still start the move slightly early. Not yet run on a phone.

### Dark mode palette: midnight violet / berry — 17:30
- **Task:** Use the given palette (#110e1b, #191528, #3c162f, #5c162e, #7c162e) for dark mode and adjust the other colours to fit.
- **Decision:** `darkPalette` in `src/constants/theme.ts`: background #110e1b, surfaces #191528 (+ a derived #241d36 for inputs), dividers #5c162e, highlights #3c162f, accent #FF5C86 with dark #110e1b text on it, text tinted violet-white. The dark map style (`src/constants/mapStyle.ts`) was retinted to the same family, with #7c162e on main roads.
- **Why:** Measured contrast first: #7c162e is 1.8:1 on the background, far below the 4.5:1 needed for text and icons, so it couldn't be the accent itself; a brighter amaranth from the same hue reaches 6.5:1. White text on that accent would be 2.9:1, so button text is dark.
- **Why it's good:** Every text colour clears 4.5:1 on the dark background (ink 16.4, inkSoft 10.2, muted 6.1); the map no longer looks like a different app from the UI around it.
- **Fallbacks / limits:** Category colours (pins, icons) are shared with light mode and weren't retuned. The light palette is unchanged. Not yet checked on a phone screen.

### Softer dark-mode accent — 17:40
- **Task:** The dark-mode pink accent was too strong.
- **Decision:** `darkPalette.accent` changed from #FF5C86 to dusty rose #E0899F (`src/constants/theme.ts`).
- **Why:** Same berry hue, saturation down from 100% to 58%. Rejected: mauve #C79BC0 (calmer, but too close to the violet surfaces to work as a highlight).
- **Why it's good:** Calmer look, and contrast actually improves: 7.5:1 on the background, 7.5:1 for the dark button text on it.
- **Fallbacks / limits:** Only the dark accent changed; light mode is untouched.

### Light mode palette: blush pastels — 17:55
- **Task:** Base the light theme on the given palette (#d8e2dc, #ffe5d9, #ffcad4, #f4acb7, #9d8189), like the dark one.
- **Decision:** `lightPalette` in `src/constants/theme.ts`: background is a lightened Powder Petal, inputs Powder Petal, highlighted rows Pastel Pink, dividers Alabaster Grey; text is a mauve-tinted near-black, captions a deepened Dusty Mauve, accent a deep rose #A9455F with white text. Severity and success colours were darkened. The light map now has its own style in the same family (`LIGHT_MAP_STYLE`), with Cherry Blossom on main roads.
- **Why:** Measured first: all five colours are under 4.5:1 as text (Dusty Mauve best at 3.3:1), so they can't carry text or the accent directly. Rejected: keeping Google's default map in light mode (its blues and greens clash with the blush UI).
- **Why it's good:** Every text colour on the background clears 4.5:1 (ink 14.3, muted 5.2, accent 5.3, success 5.2, severity ≥ 4.5), and light and dark mode now both have a deliberate, matching map.
- **Fallbacks / limits:** On the single highlighted Pastel Pink row, caption text drops to about 3.9:1. Category colours (pins, icons) are unchanged. Not yet checked on a phone screen.

### README rewrite — 18:10
- **Task:** Replace the Expo starter README with a real one for the project, no emojis, in a human tone.
- **Decision:** `README.md` covers what the app does, how duplicate detection and priority work (numbers taken from `backend/src/config/matching.ts` and `priority.service.ts`), the stack, layout, setup for Supabase, server and app, mock mode, the API in brief, how to check changes, and an honest limitations list.
- **Why:** Every command, env var and endpoint was checked against the repo and `roadmap.md` §4 rather than written from memory. Rejected: duplicating the full contract (it would drift from `roadmap.md`, so the README links to it).
- **Why it's good:** A judge or new teammate can understand the idea in the first paragraph and run the project from the setup section alone.
- **Fallbacks / limits:** `LICENSE` still contains the Expo template's MIT text (copyright 650 Industries); the README only points to it. Setup steps were not re-run from scratch on a clean machine.
