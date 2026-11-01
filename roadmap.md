# CitizenSignal — Product and Technical Roadmap

> **Purpose:** A community-powered civic issue map that detects duplicate complaints and catches infrastructure problems that return after being marked resolved.
> **Core behavior:** A report near a resolved issue can reopen it, increment `recurrence_count`, and attach the new photo as evidence instead of creating a disconnected complaint.

---

## 1. Product and platform decisions

| Topic | Decision |
|---|---|
| Platform | **Android only**, tested in Expo Go. No iOS work (no HEIC handling, no iOS-specific config). |
| Auth | **Supabase Auth, email + password.** One form: `POST /api/auth/login` signs in, or creates the account first if the email is new. The server creates accounts already confirmed (`auth.admin.createUser({ email_confirm: true })`), so no confirmation email or OTP is ever sent. Dashboard: Authentication → Sign In / Providers → **Email enabled**. No Google, no magic links. |
| What needs login | **Upvoting and commenting require login.** Browsing the map/list is public. Reporting uses *optional* auth (user id attached if logged in). To make reporting login-only later, swap `optionalAuth` → `requireAuth` on one route. |
| Token flow | App gets `{ access_token, refresh_token }` from `POST /api/auth/login`, stores them with `supabase.auth.setSession` (so `@supabase/supabase-js` refreshes them) → sends `Authorization: Bearer <access_token>` to Express → server verifies with `supabase.auth.getUser(token)`. |
| Admin | A fixed list of emails in the server's `ADMIN_EMAILS` (e.g. `admin@gmail.com`). Admins log in through the same form; the server decides the role from the verified email, never the request. The app shows them a **Manage Issues** screen (hamburger menu): every issue in the selected area, open and fixed, with close / reopen buttons. No roles table, no invites. |
| Mandatory packages | **Zod, Multer, Sharp, Geolib, string-similarity** — all five used on the server, versions below. |

### Mandatory package versions (backend)

```
npm i express@5 cors dotenv @supabase/supabase-js multer@^2.0.2 sharp zod geolib string-similarity@4.0.4
npm i -D typescript tsx @types/node @types/express @types/cors @types/multer @types/string-similarity
```

- **multer ≥ 2.0.2** — earlier versions have known DoS vulnerabilities. Do not install 1.x.
- **string-similarity@4.0.4** — the final release. npm flags it deprecated; it still works fine (Dice coefficient). Pin it, ignore the warning, mention it in the README.
- **zod, sharp, geolib** — install latest. Use Node 24 for the backend runtime.
- Frontend also uses `zod` and `geolib` (see §3).

---

## 2. Repo structure (backend and frontend fully separate)

```
citizensignal/
├── roadmap.md
├── agents.md
├── checklist.md
├── qa-backend.md                 # Track A decision log (see agents.md)
├── qa-frontend.md                # Track B decision log (see agents.md)
├── README.md
│
├── backend/                      # Track A — owns everything in here
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── sql/
│   │   └── schema.sql            # tables + indexes + storage notes
│   ├── scripts/
│   │   ├── seed.ts               # repeatable sample data (resolved pothole + neighbours, with photos)
│   │   └── smoke.ts              # `npm run smoke`: end-to-end test of every write path (self-cleaning)
│   └── src/
│       ├── server.ts             # starts listening
│       ├── app.ts                # express app, middleware, routes
│       ├── config/
│       │   ├── env.ts            # validated env (Zod)
│       │   ├── supabase.ts       # service-role client
│       │   └── matching.ts       # ALL thresholds live here
│       ├── middleware/
│       │   ├── auth.ts           # requireAuth + optionalAuth
│       │   ├── upload.ts         # Multer config
│       │   └── error.ts          # one error shape for everything
│       ├── schemas/
│       │   └── issue.schema.ts   # Zod schemas (report, list query, ids)
│       ├── routes/
│       │   ├── health.routes.ts
│       │   ├── auth.routes.ts
│       │   └── issues.routes.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   └── issues.controller.ts
│       ├── services/
│       │   ├── image.service.ts      # Sharp + storage upload
│       │   ├── matching.service.ts   # Geolib + string-similarity
│       │   ├── priority.service.ts   # the one priority formula
│       │   └── issues.service.ts     # DB reads/writes
│       └── types/
│           └── index.ts
│
└── frontend/                     # Track B — owns everything in here
    ├── package.json
    ├── app.json
    ├── .env.example
    ├── app/                      # Expo Router screens
    │   ├── _layout.tsx           # QueryClient + AuthProvider
    │   ├── index.tsx             # Map and nearby feed
    │   ├── search.tsx
    │   ├── report.tsx
    │   ├── my-issues.tsx
    │   ├── admin.tsx
    │   ├── settings.tsx
    │   ├── help.tsx
    │   ├── issue/[id].tsx        # Detail + upvote + evidence + comments
    │   └── login.tsx             # email + password sign-in or registration
    └── src/
        ├── api/
        │   ├── client.ts         # fetch wrapper, adds Bearer token
        │   ├── issues.ts         # one function per endpoint
        │   └── mock.ts           # fixtures so UI works before the backend does
        ├── auth/
        │   └── AuthProvider.tsx  # session state
        ├── lib/
        │   └── supabase.ts       # client with AsyncStorage session
        ├── hooks/                # useIssues, useReportIssue, useUpvote ...
        ├── components/           # IssueCard, CategoryChip, DuplicateSheet ...
        ├── constants/            # categories, colours
        ├── location/             # current location and selected area
        ├── theme/                # light/dark theme state
        └── types/                # mirrors the API contract in §4
```

**Rule:** the two folders never import from each other. They only talk through the HTTP contract in §4.

### Frontend dependencies (use `npx expo install` so versions match your SDK)

```
npx expo install expo-router expo-location expo-image-picker expo-image-manipulator expo-constants \
  react-native-maps @react-native-async-storage/async-storage react-native-url-polyfill
npm i @tanstack/react-query @supabase/supabase-js zod geolib
```

Android + Expo Go: `react-native-maps` works out of the box (no Google Maps key needed in Expo Go). If a phone's Expo Go doesn't match your SDK, get the right build from **expo.dev/go**.

---

## 3. Environment variables

| Backend `.env` | Frontend `.env` |
|---|---|
| `PORT=4000` | `EXPO_PUBLIC_API_URL=http://<LAN-IP-or-tunnel>:4000` |
| `SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` (**server only, never in the app**) | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `CORS_ORIGIN=*` | `EXPO_PUBLIC_USE_MOCK=true/false` |
| `ADMIN_EMAILS=admin@gmail.com` (comma-separated) | — (with mock auth, any `admin@…` email is an admin) |

Phones cannot reach `localhost`. Use the computer's LAN IP (same Wi-Fi) or a tunnel (Cloudflare Tunnel / ngrok).

---

## 4. API contract (source of truth for both tracks)

Base: `/api`. JSON everywhere except the report endpoint (multipart). Errors always look like:
`{ "error": { "code": "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER_ERROR", "message": "...", "details": [{ "field": "...", "message": "..." }] } }`

Categories: `pothole`, `streetlight`, `garbage`, `water_leak`, `drainage`, `road_damage`, `other`.
Statuses: `open`, `resolved`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness check |
| POST | `/auth/login` | none | JSON `{ email, password }` (password 6–72 chars) → `{ access_token, refresh_token, created, is_admin }`: **200** signed in, **201** account created and signed in. Wrong password for an existing email → 401. |
| GET | `/auth/me` | **required** | `{ id, email, is_admin }`. The app calls it on start, because a restored session never goes through login. |
| GET | `/issues?lat&lng&radius_m=2000` | optional | Nearby issues, sorted by priority. Includes `has_upvoted` if token present. Optional filters below. |
| GET | `/issues/mine` | **required** | `{ issues: MyIssue[] }` — issues the caller reported **or** contributed evidence to, newest own activity first (max 100). |
| GET | `/issues/:id` | optional | `{ issue, evidence, resolution_history }`; each history row has `id`, `resolved_at`, and nullable `reopened_at` |
| POST | `/issues` | optional | Report (multipart). Runs the matching pipeline. |
| POST | `/issues/:id/upvote` | **required** | Add upvote (one per user per issue) |
| DELETE | `/issues/:id/upvote` | **required** | Remove upvote |
| PATCH | `/issues/:id/status` | **admin** | JSON `{ status: "resolved" \| "open" }` → `{ issue }`. `resolved` sets `resolved_at=now()`; `open` clears `resolved_at` and leaves `recurrence_count` alone (an admin undo, not a recurrence). Same status again → 200, unchanged. No token → 401, non-admin → **403 `FORBIDDEN`**. |
| GET | `/issues/:id/comments` | optional | `{ comments: Comment[] }`, oldest first (max 200). `is_mine` is true for the caller's own comments. |
| POST | `/issues/:id/comments` | **required** | JSON `{ body }` (1–500 chars after trim) → **201** `{ comment }`. Author comes from the token, never the body. |

**`GET /issues` query:** `lat`, `lng` (required); `radius_m` (default 2000, max 20000); optional `q` (≤ 100 chars; every word must appear in title or description, case-insensitive, punctuation ignored), `category`, `status`. Invalid values → 400 `VALIDATION_ERROR`. Without `status` it returns open **and** resolved issues — the admin screen uses that; the map and feed send `status=open`.

**Issue object** (list + detail):
`id, category, title, description, latitude, longitude, status, image_url, upvotes, evidence_count, recurrence_count, comment_count, priority, days_open, created_at, resolved_at, reopened_at, has_upvoted`

**Comment object:** `id, issue_id, author, body, created_at, is_mine`. `author` is a public display name: "Meera K." from a profile name if there is one, otherwise the part of the email before the @ (never the full address), else "Citizen".

**Resolution history row** (`GET /issues/:id`): `id, resolved_at, reopened_at`. A new row is written whenever an open issue becomes resolved; reopening closes that cycle. Existing databases can backfill only the latest `resolved_at` still present on each issue.

**MyIssue object** (`/issues/mine`): Issue + `my_role`: `"reporter"` (caller created it) or `"contributor"` (caller's report was merged into it, including reopening it). Logged-out reports have no owner, so they never appear here.

**`POST /issues` — multipart fields:** `category`, `description` (short, 10–280 chars), `latitude`, `longitude`, `photo` (file), plus optional `confirm_issue_id` (user said "yes, same issue") or `force_new=true` (user said "no, different").

**`POST /issues` — response `{ outcome, issue, candidates? }`:**

| outcome | Meaning | HTTP |
|---|---|---|
| `created` | No match → new issue | 201 |
| `merged` | Auto-matched an open issue → evidence added, priority up | 200 |
| `reopened` | Matched a **resolved** issue → reopened, `recurrence_count` +1, evidence added | 200 |
| `needs_confirmation` | Possible duplicates; nothing saved yet. `candidates[]` has up to 3 issues with `text_score` and `distance_m`. | 200 |

Confirmation flow is **stateless**: the app re-submits the same form with `confirm_issue_id=<id>` (merge/reopen that issue) or `force_new=true` (create a new one). No draft tables needed.

---

## 5. Database (Supabase Postgres) — `backend/sql/schema.sql`

**`issues`**
| Column | Notes |
|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` |
| `category` | text, not null |
| `title` | text (generated from category + first words of description) |
| `description` | text, not null |
| `latitude`, `longitude` | double precision, not null |
| `status` | text: `open` / `resolved`, default `open` |
| `image_url` | text (first photo) |
| `upvotes` | int, default 0 |
| `evidence_count` | int, default 1 |
| `recurrence_count` | int, default 0 |
| `comment_count` | int, default 0 (cached count of `comments` rows) |
| `created_by` | uuid, nullable (auth user) |
| `created_at`, `resolved_at`, `reopened_at` | timestamptz; `issue_resolutions` stores every fix/reopen cycle |

**`evidence`** — `id`, `issue_id` (FK), `description`, `image_url`, `latitude`, `longitude`, `created_by` (nullable), `created_at`
**`upvotes`** — `issue_id` (FK), `user_id` (uuid, FK to `auth.users`), `created_at`, **primary key `(issue_id, user_id)`** → one vote per user, enforced by the DB.
**`comments`** — `id`, `issue_id` (FK, cascade), `user_id` (FK to `auth.users`), `author` (display name), `body` (1–500 chars), `created_at`.

**`issue_resolutions`** — `id`, `issue_id` (FK, cascade), `resolved_at`, nullable `reopened_at`, one row per fix cycle.

Indexes: `issues(latitude, longitude)`, `issues(status)`, `evidence(issue_id)`, `comments(issue_id, created_at)`, `issue_resolutions(issue_id, resolved_at)`.
Storage: public bucket **`issue-images`**.
Database triggers update the `upvotes`, `evidence_count` and `comment_count` counters in the same transaction as child-row writes. Report creation uses a category-scoped transaction lock to catch concurrent nearby issue inserts before committing a new issue; matching remains in Node and reuses Geolib/string-similarity when a concurrent candidate appears. Evidence insertion, reopening, recurrence increments, and resolution history are atomic. Re-run `backend/sql/schema.sql` against existing projects to install the idempotent migration and backfill the latest fix date still available.

---

## 6. Matching rules (all thresholds in `backend/src/config/matching.ts`)

Your spec said "95% location" — we interpret that as **distance in metres**.

| Constant | Value | Meaning |
|---|---|---|
| `AUTO_MERGE_TEXT` | 0.75 | Text similarity at/above this + close enough → same issue |
| `AUTO_MERGE_METRES` | 25 | "Close enough" for auto-merge |
| `CANDIDATE_TEXT` | 0.50 | Text similarity at/above this → ask the user |
| `CANDIDATE_METRES` | 50 | Max distance to be a candidate at all |
| `PREFILTER_METRES` | 75 | Bounding-box radius used in the SQL query |

Pipeline order (`matching.service.ts`):
1. If `confirm_issue_id` → skip matching, merge into it. If `force_new` → skip matching, create.
2. Fetch same-category issues inside the bounding box (open **and** resolved).
3. Geolib `getDistance` → drop anything > `CANDIDATE_METRES`.
4. Normalize both descriptions (lowercase, strip punctuation, trim) → `compareTwoStrings`.
5. Best match has text ≥ 0.75 **and** distance ≤ 25 m → auto-merge.
6. Else any with text ≥ 0.50 → return `needs_confirmation` (top 3).
7. Else create new. Before committing, a category-scoped transaction lock checks whether a nearby row appeared after matching; if one did, the server repeats this Node matching pipeline before creating.

Merging into an issue: insert `evidence` row, `evidence_count + 1`. If it was `resolved` → set `status='open'`, `reopened_at=now()`, `recurrence_count + 1`, outcome `reopened`.

---

## 7. Priority (one formula, one file: `priority.service.ts`)

Computed **at read time** — no cron job, always fresh.

```
priority = 2*upvotes + 1*evidence_count + 5*recurrence_count + 1.5*days_open
```
(`days_open` counts from `created_at`, or from `reopened_at` if reopened; `0` when resolved.)
Weights are initial estimates. Validate the ordering against representative issue data and adjust the weights as needed. List endpoints sort by this descending.

---

## 8. Working across the app and server

The frontend and backend remain separate projects and communicate through the HTTP contract in §4. Track A owns `backend/`; Track B owns `frontend/`. Coordinate any contract change with both sides, update this document, then update the client and server together.

For local setup and run commands, use the instructions in `README.md`. Use `EXPO_PUBLIC_USE_MOCK=true` for frontend development without a running API. The backend seed script supplies repeatable sample records for local development and verification.

## 9. Core acceptance scenarios

Use these scenarios when validating changes to reporting, matching, or account flows:

1. Submit a report with a valid category, description, location, and photo. A new issue is created when no match exists.
2. Submit a similar report near an open issue. It is merged as additional evidence.
3. Submit a similar report near a resolved issue. The issue reopens, its recurrence count increases, and the report is attached as evidence.
4. Submit a possible but uncertain match. The API returns candidates without saving; confirming a candidate merges the report, while choosing a new issue creates one.
5. Browse and report while logged out. Signing in is required for upvotes, comments, and admin actions; only configured admin accounts can change issue status.
6. Resolve, reopen, and resolve an issue again; its detail timeline shows both fix dates and the reopen date between them.

## 10. Future development

- Expand staff triage tools beyond the existing Manage Issues screen.
- Notify contributors when an issue is resolved or reopens.
- Extend search to areas beyond the currently loaded map region.
- Add iOS support.
