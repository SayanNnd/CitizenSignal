# agents.md — Instructions for AI coding agents and humans

Read this before touching the repo. Then read `roadmap.md` (decisions, API contract, DB schema, matching rules). If this file and `roadmap.md` disagree, **`roadmap.md` wins** — and fix this file.

## Project in one paragraph

CitizenSignal is a civic issue map. People report infrastructure problems with a photo and GPS location. The server compares each new report with nearby ones (distance via Geolib, text similarity via string-similarity), merges duplicates, reopens issues that were marked resolved, and ranks everything by a priority score that grows with time and upvotes. Hackathon build: ~5 hours, demo-driven.

## Stack

- **Frontend:** React Native + Expo (Expo Go on **Android only**), TypeScript, Expo Router, TanStack Query, `react-native-maps`, `expo-location`, `expo-image-picker`, `expo-image-manipulator`.
- **Backend:** Node 24, Express 5, TypeScript run with `tsx`, Supabase (Postgres + Storage + Auth).
- **Mandatory packages (never remove, never replace):** **Zod, Multer, Sharp, Geolib, string-similarity.**
  - Multer must be **≥ 2.0.2**. Pin `string-similarity@4.0.4` (deprecated on npm but works — leave it).
  - Each one must be genuinely used in the backend: Zod validates requests, Multer receives the photo, Sharp re-encodes it, Geolib measures distance, string-similarity scores description similarity.

## Docs lookup — use the Context7 MCP server

Several libraries here are new or changed recently (Express 5, Multer 2.x, Zod, Expo SDK / Expo Router, Supabase JS, TanStack Query), so memory-based answers are often outdated or wrong.

- **Before writing code that calls a library API, fetch the current docs through the Context7 MCP server.** Add `use context7` to the prompt, or call its tools directly (resolve the library, then fetch its docs).
- Always do this for: Express 5 (async error handling, routing changes), Multer 2.x, Sharp, Zod, Geolib, string-similarity, `@supabase/supabase-js` (auth + storage), Expo Router, `expo-location`, `expo-image-picker`, `expo-image-manipulator`, `react-native-maps`, TanStack Query.
- Prefer version-specific docs that match what's in `package.json`. If Context7 and your memory disagree, **Context7 wins**.
- If Context7 is unavailable, say so and fall back to the official docs site. Don't guess an API signature.
- Setup (once per machine): add the server `@upstash/context7-mcp` to your agent/editor's MCP config, e.g. `npx -y @upstash/context7-mcp`. For Claude Code: `claude mcp add context7 -- npx -y @upstash/context7-mcp`.

## Ownership — stay in your lane

| Folder | Owner | Rule |
|---|---|---|
| `backend/` | Track A | Frontend work must not edit it |
| `frontend/` | Track B | Backend work must not edit it |
| `roadmap.md` §4 (API contract) | Both | Change only after telling the other track |
| `checklist.md` | Both | Tick boxes only for things actually verified |

`backend/` and `frontend/` **never import from each other**. They communicate only through the HTTP contract.

## Commands

```
# backend
cd backend && npm install && npm run dev      # tsx watch src/server.ts → http://0.0.0.0:4000
npm run seed                                   # resets demo data (scripts/seed.ts)
npx tsc --noEmit                               # type check

# frontend
cd frontend && npm install && npx expo start   # scan the QR with Expo Go on Android
```

Server must listen on `0.0.0.0` so phones can reach it. Phones cannot use `localhost`.

## Backend conventions

- Route → controller → service. **No business logic in routes.** Controllers parse input and shape output; services do the work.
- **Validate every input with Zod** before use. Multipart fields are strings → use `z.coerce.number()` for lat/lng and range-check them (-90..90, -180..180).
- Multer: `memoryStorage`, 5 MB limit, accept `image/jpeg|png|webp` only, field name `photo`.
- Sharp: `.rotate()` (EXIF), resize to max 1280 px without enlarging, convert to WebP (~quality 80), then upload the buffer to bucket `issue-images`.
- **All thresholds** live in `src/config/matching.ts`. Never hardcode 0.75 / 25 / 0.5 / 50 elsewhere.
- **One priority formula**, in `priority.service.ts`, used by every endpoint that returns issues. Computed at read time.
- Errors: throw, let `middleware/error.ts` format them. Shape is defined in `roadmap.md` §4. Express 5 forwards async errors automatically — don't wrap everything in try/catch.
- Auth: `requireAuth` (upvote routes) and `optionalAuth` (report, read routes). Verify the Bearer token with `supabase.auth.getUser(token)`. **Never trust a user id sent in the body.**
- The Supabase **service-role key stays on the server**. It must never appear in `frontend/` or in logs.
- Upvotes: one per user per issue, enforced by the `(issue_id, user_id)` primary key. Handle the duplicate-insert case gracefully (return current state, not a 500).

## Frontend conventions

- One function per endpoint in `src/api/issues.ts`. Screens never call `fetch` directly.
- Server state via TanStack Query; invalidate the issues query after report/upvote.
- Types in `src/types/` mirror the contract. Update them whenever the contract changes.
- `EXPO_PUBLIC_USE_MOCK=true` serves fixtures from `src/api/mock.ts` so UI work doesn't block on the backend. Mock data must match the contract's shapes exactly.
- Browsing and reporting work logged-out. **Upvote while logged-out → navigate to `/login`**, then return and complete the upvote.
- Photo: get a JPEG from `expo-image-picker`, shrink with `expo-image-manipulator` before upload. No iOS-specific code.
- Handle all four states on every data screen: loading, empty, error, success.
- `StyleSheet` only. No styling frameworks, no new UI libraries.

## Matching and priority — don't "improve" these

- Order: same category → bounding-box prefilter → Geolib distance → string-similarity score → three outcomes (`merged`/`reopened`, `needs_confirmation`, `created`).
- Resolved issues **must** be included as candidates — that is the headline feature.
- `needs_confirmation` saves nothing. The app re-submits with `confirm_issue_id` or `force_new=true`.
- Priority formula: see `roadmap.md` §7. Only tune the weights, don't restructure.

## Out of scope — do not build

Roles/admin portal, social login, push notifications, AI image analysis, chat, payments, heatmaps, analytics, iOS support, extra npm packages beyond the roadmap unless the team agrees. If an idea isn't in `roadmap.md`, put it in README under "Future work".

## Git workflow

- `main` is always runnable. Never commit directly to it after the first scaffold.
- Branch names: `backend/<thing>`, `frontend/<thing>`. Small commits, clear messages (`backend: add upvote endpoint`).
- `git pull --rebase` before pushing. Merge to `main` as soon as a feature works — don't sit on big branches.
- Never commit `.env`. Keep `.env.example` current.

## Definition of done (for any task)

1. Works on a real Android phone in Expo Go (frontend) or via curl/REST client (backend).
2. `npx tsc --noEmit` passes in the folder you changed.
3. Matches the contract in `roadmap.md` §4 exactly (field names, status codes, error shape).
4. Error and empty cases handled.
5. Relevant item ticked in `checklist.md`.

## If you're an AI agent and unsure

- Prefer the smallest change that satisfies the task. Don't refactor unrelated files.
- Don't invent endpoints, columns, or env vars — check `roadmap.md` first; if it's missing, ask.
- Don't remove or swap the mandatory packages, silence type errors with `any`, or mock the backend inside `backend/`.
- When a requirement is ambiguous, say what you assumed in your final message.
