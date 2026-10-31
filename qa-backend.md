# qa-backend.md — Backend decision log (Track A)

Append-only. One entry per task, newest at the bottom. Only Track A writes here. Rules are in `agents.md` ("Decision log").
Use this file to answer judges' "why did you do it this way?" questions about the server.

## Entry template

```
### <short task name> — <HH:MM>
- **Task:** what was asked
- **Decision:** what we chose, and where it lives (file/function)
- **Why:** reason, and the alternative we rejected
- **Why it's good:** concrete benefit
- **Fallbacks / limits:** weaknesses, shortcuts, what we'd do with more time
```

---

## Entries

### Backend decisions locked at kickoff — 11:45
- **Task:** Agree the server design before coding.
- **Decision:** Stateless duplicate confirmation (client re-submits with `confirm_issue_id` or `force_new`); priority computed at read time in `priority.service.ts`; one-vote-per-user enforced by the `(issue_id, user_id)` primary key; Supabase service-role key used server-side only; bearer token verified with `supabase.auth.getUser`.
- **Why:** Fewest moving parts for a 5-hour build. Rejected: draft tables for pending reports (extra schema and cleanup), a cron job for aging priority (needs a scheduler), trusting a user id from the request body (spoofable).
- **Why it's good:** No background jobs or leftover drafts; priority is always fresh; the database itself blocks double votes.
- **Fallbacks / limits:** Priority weights are hand-tuned guesses; the photo is re-uploaded on confirmation; `string-similarity` is deprecated on npm (pinned at 4.0.4, still works); no admin portal, so issues are marked resolved in Supabase Studio.

### Backend hardening pass: matching, errors, uploads, seed — 13:20
- **Task:** Review the scaffolded backend against `roadmap.md`, fix bugs, bring it to contract.
- **Decision:** `reportIssue` (`issues.service.ts`) now *plans* first (confirm / force / match) and uploads the photo only when a row will be written; `confirm_issue_id` onto a resolved issue now reopens it. One `HttpError` class (`lib/http-error.ts`) + `middleware/error.ts` map Zod, Multer, body-parser and app errors to the §4 shape; unknown routes → 404 `NOT_FOUND`. Bounding boxes use Geolib `getBoundsOfDistance` (`lib/geo.ts`) for both matching and the list endpoint. Responses are whitelisted via `toIssue`/`toEvidence` (no `created_by`). `req.user` typed via `types/express.d.ts` instead of `any`. Seed script creates the `issue-images` bucket if missing, writes evidence rows that match `evidence_count`, and takes optional `<lat> <lng>` args.
- **Why:** The old flow orphaned uploads on `needs_confirmation` and never reopened on confirm (breaks the headline demo). Fixed-degree bboxes shrink in longitude away from the equator and could miss 50 m candidates. Rejected: wrapping every handler in try/catch (Express 5 already forwards async errors).
- **Why it's good:** `needs_confirmation` truly saves nothing; every failure (bad fields, no photo, >5 MB, wrong type, corrupt image, bad JSON, bad/missing token, missing issue) returns a clean 4xx with `details[]` — all verified with curl. The demo can be seeded at the venue's coordinates.
- **Fallbacks / limits:** `days_open` is whole days, so same-day issues tie on aging (ties broken by newest). Counter updates are read-modify-write, not atomic — a Postgres RPC would fix races under concurrency. `radius_m` capped at 20 km. If the DB write fails after upload, the image is deleted best-effort. Write paths (created/merged/reopened, real-token upvotes) not yet verified live — bucket was missing.
- **Note:** Google OAuth requested mid-task — no backend change needed: Google sign-ins produce the same Supabase access token that `requireAuth`/`optionalAuth` already verify.

### "Your Issues" endpoint + server-side search — 13:45
- **Task:** Frontend request: add `GET /issues/mine`, fix confirm-path reopen, add bbox prefilter to the list, optional `q` filter.
- **Decision:** Reopen fix and bbox prefilter were already done in the previous pass. `getMyIssues` (`issues.service.ts`) returns issues the user **reported or contributed evidence to**, tagged `my_role: reporter|contributor`, sorted by the user's latest activity, max 100; route registered above `/:id`. `GET /issues` gained optional `q`, `category`, `status`: `q` is run through the matching `normalize()` and split into ≤ 5 words, each must match title or description via `ilike` (AND across words). Added `created_by` indexes in `schema.sql`. Contract §4 updated.
- **Why:** Filtering only on `created_by` (the requested design) hides the demo's headline case — a report that reopens or merges into someone else's issue would never show up in "Your Issues". Rejected: fuzzy (string-similarity) search — less predictable for a search box than substring match; escaping raw user input into PostgREST filters — normalizing to letters/digits/spaces removes every metacharacter instead.
- **Why it's good:** Users always see where their reports went; search scales past one screen of results and composes with the bbox; no injection surface in the `or=` filter. Verified with curl: AND search, case-insensitivity, metacharacters, empty/oversized/repeated `q`, bad category/status → 400, `/mine` → 401 without/with bad token.
- **Fallbacks / limits:** `/mine` with a real token not yet verified live (needs a test user). Substring search, no stemming (searching "leak" finds "leaking", but searching "leaking" doesn't find "leak"). Logged-out reports have no owner, so they never appear in "Your Issues". `created_by` indexes must be run manually in the SQL editor (optional at demo scale).

### Pre-commit review of all backend changes — 14:05
- **Task:** Review every change before the first commit of this work.
- **Decision:** Four fixes. (1) `schemas/issue.schema.ts`: blank fields are treated as missing before `z.coerce.number()` — otherwise `latitude=""` became 0 and a no-GPS report landed at 0,0; same for blank `confirm_issue_id`/`force_new`/`radius_m`. (2) `image.service.ts`: Sharp `failOn: 'error'` instead of the default `'warning'`. (3) `issues.service.ts`: timestamps compared as parsed milliseconds, not strings. (4) `addEvidence` deletes its evidence row if the issue update fails, so it never points at a cleaned-up photo.
- **Why:** (1) and (2) would have broken the demo silently (wrong location, or a real phone photo rejected). Postgres returns varying fractional-second digits, so string comparison isn't reliable for ordering.
- **Why it's good:** Verified with a 25-case HTTP suite (all pass, no 5xx logged, DB unchanged afterwards), schema edge-case tests, `tsc --noEmit` clean, no secrets in the diff, `.env` ignored.
- **Fallbacks / limits:** Still not verified live: `created`/`merged`/`reopened` writes, Sharp upload to the bucket, upvotes and `/mine` with a real token — needs a test user and a re-seed afterwards.

### Backend status check (no code changes) — 14:21
- **Task:** Report how much of the backend is done and whether it's bug-free.
- **Decision:** No design choice. Re-verified read-only: `tsc --noEmit` clean; health, list (+ `q`/`status` filters), detail, 400/401/404 paths, Multer/Sharp rejection all correct against the live DB; seeded demo phrases score 0.823 (→ reopen) and 0.674 (→ needs_confirmation) as intended.
- **Why:** Writes were deliberately not exercised — they mutate the shared demo DB and need a real test user.
- **Why it's good:** Confirms every §4 endpoint exists and the error contract holds; remaining risk is isolated to the untested write paths.
- **Fallbacks / limits:** Still unverified live: created/merged/reopened writes, Sharp→bucket upload, upvotes and `/mine` with a real token. Seed issues have no photos (`image_url` null). Resolved issues can outrank open ones in the list (resolved pothole 19 > open streetlight 10) — weight-tuning item.

### Live write-path tests, risk fixes, Zod 4 — 14:37
- **Task:** Test every write path live, fix the known risks, move to Zod 4 if worthwhile.
- **Decision:** (1) `scripts/smoke.ts` (`npm run smoke`): 38 HTTP checks against a running server — created/merged/reopened/needs_confirmation, confirm/force_new, Sharp output (WebP, EXIF-rotated, ≤ 1280 px), upvotes, `/mine`, concurrency — with a throwaway user (admin magic link, since email login is off) in a random empty spot, cleaning up rows, photos and user afterwards. (2) Counters (`issues.service.ts`): `syncCounter` recounts `upvotes`/`evidence` rows and re-checks after writing; reopen is a conditional update (`status='resolved'` and unchanged `recurrence_count`), so parallel reports reopen once. (3) `matching.service.ts`: auto-merge picks the best match passing *both* thresholds, not just the top text score. (4) Seed draws a placeholder photo per issue/evidence through the real Sharp pipeline and empties the bucket on reset. (5) Zod 3 → 4.6 (`error` param, `z.uuid()`, `z.url()`, `z.prettifyError`).
- **Why:** Read-modify-write counters lost increments under concurrent reports; a Postgres RPC/trigger would be atomic but needs SQL run by hand in the dashboard — rejected for now. Old matching asked "same issue?" when a 40 m look-alike outscored a clear 10 m match. Zod 4 is the current major (roadmap says "latest"), faster, and unifies error customisation.
- **Why it's good:** All 38 checks pass on 3 consecutive runs, no 5xx. Behaviour diff of 38 schema edge cases between Zod 3 and 4: identical except a clearer message for non-string descriptions and stricter UUIDs. Demo detail screens now have photos.
- **Fallbacks / limits:** Counter sync costs one extra count query per write and caps its re-check loop at 5. `z.uuid()` rejects non-RFC ids like `0000…0001` with 400 instead of 404 (real ids are v4). Seed placeholder font varies by OS. Smoke test needs the server running and uses the shared project (isolated by location, self-cleaning).

### Docs: Google-only auth decision — 14:41
- **Task:** Update roadmap/agents/checklist to the new auth decision.
- **Decision:** `roadmap.md` §1: auth is Supabase **Google sign-in only** (email provider off), with Site URL `citizensignal://`, Redirect URLs `exp://**`, and the Expo flow (`signInWithOAuth` + `skipBrowserRedirect` → `openAuthSessionAsync` → `setSession`). Added `expo-auth-session`/`expo-web-browser` to the frontend install list; `agents.md` out-of-scope now excludes only *non-Google* social login and email/password; checklist "Confirm email" marked N/A and the login item reworded. Documented `npm run smoke`.
- **Why:** Google was already set up in the dashboard and the docs still said "no social login". Login sent users to localhost because Supabase falls back to the Site URL when `redirectTo` is missing or not allow-listed — writing the exact settings down stops that recurring.
- **Why it's good:** No backend change — `requireAuth`/`optionalAuth` verify any Supabase token; API contract §4 untouched.
- **Fallbacks / limits:** Expo Go's `exp://` address changes with the laptop's IP — the `exp://**` wildcard covers that. A production build would use `citizensignal://` instead. Frontend code for the flow is Track B's and not in any branch yet.
