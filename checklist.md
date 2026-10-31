# checklist.md — CitizenSignal work pipeline

Tags: **[A]** backend · **[B]** frontend · **[ALL]** everyone. Tick a box only after you've verified it works.
Clock times assume an 11:45 start; keep the order if yours differs.

---

## Phase 0 — Setup (11:45–12:15)

- [ ] [ALL] Create repo, push `main`, add `backend/` and `frontend/` folders and the three .md files
- [ ] [ALL] Create Supabase project
- [ ] [ALL] Supabase Auth → Email provider → **"Confirm email" OFF**
- [ ] [ALL] Run `backend/sql/schema.sql` (issues, evidence, upvotes + indexes)
- [ ] [ALL] Create **public** storage bucket `issue-images`
- [ ] [ALL] Decide network route: LAN IP or tunnel; write the URL in the team chat
- [ ] [ALL] Everyone has Expo Go on an Android phone that matches the project's SDK (expo.dev/go if not)
- [ ] [A] `backend/` scaffolded; installed: express@5, cors, dotenv, @supabase/supabase-js, **multer@^2.0.2, sharp, zod, geolib, string-similarity@4.0.4** (+ dev types)
- [ ] [A] `GET /api/health` returns 200 and is reachable **from a phone's browser**
- [ ] [A] `.env` filled, `.env.example` committed
- [ ] [B] `frontend/` scaffolded with Expo Router; app opens on a real phone
- [ ] [B] Frontend deps installed with `npx expo install` (maps, location, picker, manipulator, async-storage, constants)
- [ ] [B] `.env` has `EXPO_PUBLIC_API_URL`, Supabase URL + anon key, `EXPO_PUBLIC_USE_MOCK`
- [ ] [ALL] API contract (`roadmap.md` §4) read and agreed by both tracks
- [ ] [ALL] **Context7 MCP server installed** in each person's agent/editor and tested once (ask a docs question with `use context7`) — see `agents.md` "Docs lookup"

## Phase 1 — Core plumbing (12:15–13:30)

**Backend**
- [ ] [A] `config/env.ts` validates env with Zod; server refuses to boot on missing vars
- [ ] [A] `middleware/error.ts` — one error shape
- [ ] [A] `middleware/auth.ts` — `requireAuth` and `optionalAuth` verified with a real token
- [ ] [A] `GET /api/issues?lat&lng&radius_m` returns seeded/dummy rows sorted by priority
- [ ] [A] `middleware/upload.ts` — Multer memory storage, 5 MB cap, image types only
- [ ] [A] Zod schema for report; bad lat/lng/short description → 400 with `details[]`
- [ ] [A] `image.service` — Sharp rotate + resize + WebP → bucket → public URL
- [ ] [A] `POST /api/issues` happy path creates an issue + image (no matching yet)

**Frontend**
- [ ] [B] `lib/supabase.ts` with AsyncStorage session persistence
- [ ] [B] `AuthProvider` + login/signup screen (email + password) working against Supabase
- [ ] [B] `api/client.ts` attaches Bearer token when logged in
- [ ] [B] Map tab with markers (mock data)
- [ ] [B] List tab with compact cards (mock data)
- [ ] [B] Location permission flow handled (granted / denied)

## Phase 2 — The headline feature (13:30–14:15)

**Backend**
- [ ] [A] `config/matching.ts` holds every threshold
- [ ] [A] `matching.service` — same category → bbox prefilter → Geolib distance → string-similarity
- [ ] [A] Outcome `merged` (text ≥ 0.75 and ≤ 25 m): evidence row added, `evidence_count` +1
- [ ] [A] Outcome `reopened` (matched issue was resolved): status → open, `recurrence_count` +1, `reopened_at` set
- [ ] [A] Outcome `needs_confirmation` (text 0.50–0.75, ≤ 50 m): returns up to 3 `candidates`, saves **nothing**
- [ ] [A] `confirm_issue_id` and `force_new=true` paths work
- [ ] [A] `priority.service` — single formula, used by list + detail
- [ ] [A] `POST/DELETE /api/issues/:id/upvote` — 401 without token, one vote per user, counter stays in sync

**Frontend**
- [ ] [B] Report form: category picker, description, photo (picker → manipulator), pin location on map (defaults to GPS)
- [ ] [B] Submit sends multipart with `photo` field correctly on Android
- [ ] [B] Submit button disabled while uploading; errors shown from `details[]`

**Shared**
- [ ] [ALL] Seed script: 1 resolved pothole + 3–4 nearby issues; `npm run seed` is repeatable

## Phase 3 — Integration #1 (14:15–15:00)

- [ ] [B] **Mock OFF** — app uses real backend
- [ ] [ALL] Report flow works end to end from a real phone (photo visible in Supabase bucket)
- [ ] [B] `DuplicateSheet` shows candidates; "Yes, same" → resubmits with `confirm_issue_id`; "No" → `force_new=true`
- [ ] [B] Upvote button: logged-out → `/login` → returns → upvote applied
- [ ] [B] Upvote button shows `has_upvoted` state; list/map refresh after report and upvote
- [ ] [B] Issue detail screen: photo, status badge, recurrence count, priority, days open
- [ ] [A] `GET /api/issues/:id` includes evidence list
- [ ] [ALL] All four outcomes (`created`, `merged`, `reopened`, `needs_confirmation`) demonstrated on a phone

## Phase 4 — Hardening (15:00–15:30)

- [ ] [A] Oversized or non-image upload → clean 400, server stays up
- [ ] [A] Missing photo / missing GPS → clean 400
- [ ] [A] Duplicate upvote doesn't 500
- [ ] [A] Tune priority weights so the seeded ordering looks sensible
- [ ] [B] Loading / empty / error states on map, list, detail
- [ ] [B] Works with location permission denied (manual pin)
- [ ] [B] Works after app restart (session persists)

## 🚫 15:30 — FEATURE FREEZE

Nothing new after this line. Fixes only.

## Phase 5 — Demo prep (15:30–16:30)

- [ ] [ALL] Run the demo script in `roadmap.md` §9 end to end, **three times**
- [ ] [A] `npm run seed` resets to a clean demo state in one command
- [ ] [A] Server and tunnel will stay up (no sleeping laptop; screen-lock off)
- [ ] [B] Demo account created and logged in on the demo phone, plus a logged-out path ready
- [ ] [ALL] Backup: screen recording of a successful run, in case Wi-Fi fails
- [ ] [ALL] README: pitch, setup steps, architecture sketch, mandatory-package usage table, known limits (string-similarity deprecated on npm, Android-only), future work
- [ ] [ALL] Decide who talks, who drives the phone, who watches the clock

## Phase 6 — Submission (16:30–16:45)

- [ ] [ALL] Final `main` pulled on the demo laptop; `.env` present locally, **not** committed
- [ ] [ALL] `git log` shows work from both tracks
- [ ] [ALL] Phones charged, Expo Go open, tunnel URL still valid
- [ ] [ALL] Submission form / repo link sent

---

## Mandatory package verification (do before submitting)

| Package | Where it's used | Verified |
|---|---|---|
| Zod | Report body, list query, env validation | [ ] |
| Multer (≥ 2.0.2) | `middleware/upload.ts` receives `photo` | [ ] |
| Sharp | `image.service` — rotate, resize, WebP | [ ] |
| Geolib | `matching.service` — distance in metres | [ ] |
| string-similarity (4.0.4) | `matching.service` — description score | [ ] |

## Cut line (if behind schedule, drop in this order)

1. Evidence list on detail (keep the count)
2. List tab
3. Un-upvote
4. Category icons/colours

**Never cut:** report flow · 3-outcome matching · reopen + recurrence · login-gated upvote.

## Bugs / blockers (add as you go)

| Time | Who | Problem | Status |
|---|---|---|---|
| | | | |
