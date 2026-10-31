# CitizenSignal — Hackathon Roadmap

> **Pitch:** A community-powered civic issue map that detects duplicate complaints and catches infrastructure problems that come back after being marked resolved.
> **Demo moment:** Report an issue next to an already-resolved pothole → the system recognizes it, **reopens** the old issue, bumps `recurrence_count`, and attaches your photo as evidence instead of creating a disconnected complaint.

Time box: ~5 hours. Assumed start 11:45 → end 16:45. **Feature freeze 15:30.** Shift the clock times if your start differs; keep the order.

---

## 1. Locked decisions (don't re-debate during the hackathon)

| Topic | Decision |
|---|---|
| Platform | **Android only**, tested in Expo Go. No iOS work (no HEIC handling, no iOS-specific config). |
| Auth | **Supabase Auth: Google only.** The app has no email/password login (removed; the Email provider can stay enabled in Supabase but the app never uses it). **Google** uses the **browser OAuth flow** (`supabase.auth.signInWithOAuth` + `expo-auth-session` + `expo-web-browser`), which works in Expo Go; `exp://**` is in Supabase's allowed redirect URLs. The Google consent screen is in **Testing** mode, so only Gmail accounts added as test users can sign in — send the demo accounts to the backend track. **Not allowed:** native Google Sign-In (`@react-native-google-signin` needs a dev build, won't run in Expo Go), other social providers, magic links (deep-link pain in Expo Go). The backend is unchanged: after any sign-in the app has a normal Supabase session and sends `Authorization: Bearer <access_token>`. |
| What needs login | **Upvoting requires login.** Browsing the map/list is public. Reporting uses *optional* auth (user id attached if logged in). To make reporting login-only later, swap `optionalAuth` → `requireAuth` on one route. |
| Token flow | App signs in with `@supabase/supabase-js` → sends `Authorization: Bearer <access_token>` to Express → server verifies with `supabase.auth.getUser(token)`. |
| Admin | None. Mark issues resolved in **Supabase Studio** (set `status='resolved'`, `resolved_at=now()`). |
| Mandatory packages | **Zod, Multer, Sharp, Geolib, string-similarity** — all five used on the server, versions below. |

### Mandatory package versions (backend)

```
npm i express@5 cors dotenv @supabase/supabase-js multer@^2.0.2 sharp zod geolib string-similarity@4.0.4
npm i -D typescript tsx @types/node @types/express @types/cors @types/multer @types/string-similarity
```

- **multer ≥ 2.0.2** — earlier versions have known DoS vulnerabilities. Do not install 1.x.
- **string-similarity@4.0.4** — the final release. npm flags it deprecated; it still works fine (Dice coefficient). Pin it, ignore the warning, mention it in the README.
- **zod, sharp, geolib** — install latest. Node 24 as planned.
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
│   │   └── seed.ts               # repeatable demo data (resolved pothole + neighbours)
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
│       │   └── issues.routes.ts
│       ├── controllers/
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
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── index.tsx         # Map
    │   │   ├── list.tsx          # Compact nearby list
    │   │   └── report.tsx        # Report form
    │   ├── issue/[id].tsx        # Detail + upvote + evidence
    │   └── login.tsx             # Login / signup (opened when upvoting logged-out)
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
        └── types/                # mirrors the API contract in §4
```

**Rule:** the two folders never import from each other. They only talk through the HTTP contract in §4.

### Frontend dependencies (use `npx expo install` so versions match your SDK)

```
npx expo install expo-router expo-location expo-image-picker expo-image-manipulator expo-constants \
  react-native-maps @react-native-async-storage/async-storage react-native-url-polyfill \
  expo-auth-session expo-web-browser
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

Phones cannot reach `localhost`. Use the laptop's LAN IP (same Wi-Fi) or a tunnel (Cloudflare Tunnel / ngrok). Decide in the first 30 minutes.

---

## 4. API contract (source of truth for both tracks)

Base: `/api`. JSON everywhere except the report endpoint (multipart). Errors always look like:
`{ "error": { "code": "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "SERVER_ERROR", "message": "...", "details": [{ "field": "...", "message": "..." }] } }`

Categories: `pothole`, `streetlight`, `garbage`, `water_leak`, `drainage`, `road_damage`, `other`.
Statuses: `open`, `resolved`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Liveness check |
| GET | `/issues?lat&lng&radius_m=2000` | optional | Nearby issues, sorted by priority. Includes `has_upvoted` if token present. Optional filters below. |
| GET | `/issues/mine` | **required** | `{ issues: MyIssue[] }` — issues the caller reported **or** contributed evidence to, newest own activity first (max 100). |
| GET | `/issues/:id` | optional | Issue + evidence list |
| POST | `/issues` | optional | Report (multipart). Runs the matching pipeline. |
| POST | `/issues/:id/upvote` | **required** | Add upvote (one per user per issue) |
| DELETE | `/issues/:id/upvote` | **required** | Remove upvote |

**`GET /issues` query:** `lat`, `lng` (required); `radius_m` (default 2000, max 20000); optional `q` (≤ 100 chars; every word must appear in title or description, case-insensitive, punctuation ignored), `category`, `status`. Invalid values → 400 `VALIDATION_ERROR`.

**Issue object** (list + detail):
`id, category, title, description, latitude, longitude, status, image_url, upvotes, evidence_count, recurrence_count, priority, days_open, created_at, resolved_at, reopened_at, has_upvoted`

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
| `created_by` | uuid, nullable (auth user) |
| `created_at`, `resolved_at`, `reopened_at` | timestamptz |

**`evidence`** — `id`, `issue_id` (FK), `description`, `image_url`, `latitude`, `longitude`, `created_by` (nullable), `created_at`
**`upvotes`** — `issue_id` (FK), `user_id` (uuid, FK to `auth.users`), `created_at`, **primary key `(issue_id, user_id)`** → one vote per user, enforced by the DB.

Indexes: `issues(latitude, longitude)`, `issues(status)`, `evidence(issue_id)`.
Storage: public bucket **`issue-images`**.
The `upvotes` counter on `issues` is updated by the server in the same request as the insert/delete into the `upvotes` table.

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
7. Else create new.

Merging into an issue: insert `evidence` row, `evidence_count + 1`. If it was `resolved` → set `status='open'`, `reopened_at=now()`, `recurrence_count + 1`, outcome `reopened`.

---

## 7. Priority (one formula, one file: `priority.service.ts`)

Computed **at read time** — no cron job, always fresh.

```
priority = 2*upvotes + 1*evidence_count + 5*recurrence_count + 1.5*days_open
```
(`days_open` counts from `created_at`, or from `reopened_at` if reopened; `0` when resolved.)
Weights are guesses — tune once the seed data is in so the demo ordering looks sensible. List endpoints sort by this descending.

---

## 8. Parallel work plan

Two tracks + one shared contract. If there's a third peer, they take the **Floating** items.

| Time | Track A — Backend | Track B — Frontend | Floating / All |
|---|---|---|---|
| 11:45–12:15 | Repo + Express skeleton, `/health`, env validation | Expo app scaffold, Expo Router tabs, env, supabase client | **All:** Supabase project, run `schema.sql`, create bucket, disable email confirm, pick LAN/tunnel URL, agree on §4 |
| 12:15–13:30 | `GET /issues`, `POST /issues` happy path: Multer → Zod → Sharp → storage → insert; `requireAuth/optionalAuth` | Login/signup screen + AuthProvider; Map + List screens on **mock data** (`EXPO_PUBLIC_USE_MOCK=true`) | Seed script skeleton |
| 13:30–14:15 | `matching.service` (3 outcomes + reopen), `priority.service`, upvote/unvote endpoints | Report form: category, description, photo (picker + manipulator), GPS pin on map | Seed script: 1 resolved pothole + 3–4 neighbours |
| 14:15–15:00 | Bug fixes from integration; `GET /issues/:id` with evidence | **Flip mock OFF**, wire real API; `DuplicateSheet` for `needs_confirmation`; upvote button with login gate | **Integration session #1** — full report flow on a real Android phone |
| 15:00–15:30 | Edge cases: validation messages, big file, no GPS | Issue detail screen, loading/empty/error states | Tune priority weights |
| **15:30** | **FEATURE FREEZE** | | |
| 15:30–16:30 | Only fixes | Only fixes + polish | Demo rehearsal ×3, README, pitch notes |
| 16:30–16:45 | Buffer | Buffer | Final seed reset, phone charged, tunnel up |

**Contract change protocol:** if either track needs to change §4, message the other first, update this file, then code.

---

## 9. Demo script (3 minutes)

1. Open the map: seeded issues, sorted by priority. (15 s)
2. Open a **resolved** pothole to show its history. (15 s)
3. Report a new issue at that spot, similar wording, with a photo → app says "this pothole came back — reopened", recurrence badge shows 1. (60 s)
4. Report another with vague wording nearby → **"Is this the same issue?"** sheet → confirm → evidence added. (45 s)
5. Tap upvote logged-out → login prompt → log in → upvote → priority rises. (30 s)
6. Close: aging priority + duplicate detection = fewer repeated complaints, faster fixes. (15 s)

---

## 10. Cut line (drop in this order if behind)

1. Evidence list on the detail screen (keep the count)
2. List tab (keep map only)
3. Un-upvote (keep upvote)
4. Category icons/colours

**Never cut:** report flow, matching with the 3 outcomes, reopen + recurrence, login-gated upvote.
