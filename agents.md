# agents.md — Instructions for AI coding agents and humans

Read this before touching the repo. Then read `roadmap.md` (decisions, API contract, DB schema, matching rules). If this file and `roadmap.md` disagree, **`roadmap.md` wins** — and fix this file.

## Project in one paragraph

CitizenSignal is a civic issue map. People report infrastructure problems with a photo and GPS location. The server compares each new report with nearby ones (distance via Geolib, text similarity via string-similarity), merges duplicates, reopens issues that were marked resolved, and ranks everything by a priority score that grows with time and upvotes.

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
| `qa-backend.md` | Track A | Backend decision log. Frontend work must not edit it |
| `qa-frontend.md` | Track B | Frontend decision log. Backend work must not edit it |

`backend/` and `frontend/` **never import from each other**. They communicate only through the HTTP contract.

## Commands

```
# backend
cd backend && npm install && npm run dev      # tsx watch src/server.ts → http://0.0.0.0:4000
npm run seed                                   # resets sample data + photos (scripts/seed.ts; use a development database)
npm run smoke                                  # end-to-end test of every write path (server must be running)
npx tsc --noEmit                               # type check

# frontend
cd frontend && npm install && npx @expo/agent-cli start   # scan the QR with Expo Go on Android
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
- Login: **email + password**, one form for both new and returning users. The app calls `POST /api/auth/login` (`src/api/auth.ts`), which signs in or creates the account (already confirmed, no OTP), then stores the tokens with `supabase.auth.setSession`. With mock data (`EXPO_PUBLIC_USE_MOCK=true`) or no Supabase config, the form signs in a fake user instead. The API takes `Authorization: Bearer <access_token>`.
- Photo: get a JPEG from `expo-image-picker`, shrink with `expo-image-manipulator` before upload. No iOS-specific code.
- Handle all four states on every data screen: loading, empty, error, success.
- `StyleSheet` only. No styling frameworks, no new UI libraries.

## Matching and priority — don't "improve" these

- Order: same category → bounding-box prefilter → Geolib distance → string-similarity score → three outcomes (`merged`/`reopened`, `needs_confirmation`, `created`).
- Resolved issues **must** be included as candidates — this is a core product behavior.
- `needs_confirmation` saves nothing. The app re-submits with `confirm_issue_id` or `force_new=true`.
- Priority formula: see `roadmap.md` §7. Only tune the weights, don't restructure.

## Out of scope — do not build

Roles, invites or an admin portal beyond the one "Manage Issues" screen for `ADMIN_EMAILS` accounts (`roadmap.md` §1), social login (Google etc.), email verification or OTP, push notifications, AI image analysis, chat, payments, heatmaps, analytics, iOS support, extra npm packages beyond the roadmap unless the team agrees. If an idea isn't in `roadmap.md`, put it in README under "Future work".

## Decision log — `qa-backend.md` / `qa-frontend.md` (required on every task)

Each track keeps its **own** decision log in the repo root: **Track A writes only `qa-backend.md`, Track B writes only `qa-frontend.md`.** Never edit the other track's file. At the end of **every task or prompt**, append one entry to your track's file before you finish. These files explain implementation decisions to future contributors, so write for a human reader who wasn't there.

Each entry has these fields, kept short (1–2 lines each):

- **Task:** what you were asked to do.
- **Decision:** the main design or implementation choice you made, and where it lives (file or function).
- **Why:** the reason you picked it over the alternatives (name the alternative you rejected).
- **Why it's good:** the concrete benefit (simplicity, reliability, matches the contract).
- **Fallbacks / limits:** small weaknesses, shortcuts, or known risks, and practical next steps. Be honest — don't oversell.

Rules: **append only** (add at the bottom, never edit or reorder earlier entries); one entry per task, grouping several small choices together. If a task had no real design choice (typo, rename), write a one-line entry saying so rather than skipping it. If you change the API contract (`roadmap.md` §4), also add a one-line note to the other track's file tagged `[ALL]`. Never put secrets or keys in these files. If two people work on the same track, `git pull --rebase` before appending.

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
6. Entry appended to your track's log (`qa-backend.md` or `qa-frontend.md`): decision, why, why it's good, fallbacks.

## If you're an AI agent and unsure

- Prefer the smallest change that satisfies the task. Don't refactor unrelated files.
- Don't invent endpoints, columns, or env vars — check `roadmap.md` first; if it's missing, ask.
- Don't remove or swap the mandatory packages, silence type errors with `any`, or mock the backend inside `backend/`.
- When a requirement is ambiguous, say what you assumed in your final message.

<!-- BEGIN EXPO AGENT CLI MANAGED BLOCK -->
<!-- Generated by `npx @expo/agent-cli agents:setup`. Everything inside the markers is overwritten on the next run. -->

## Expo project

- Project: citizen-signal, in **`frontend/`** (the repo root is not an Expo project; run every `@expo/agent-cli` command from `frontend/`)
- SDK: 58.0.21
- Native: CNG (no native directories; they are generated by `npx expo prebuild`)
- Expo Go: compatible (Expo Go can run this project)
- Dev client: `expo-dev-client` is not installed

## Commands

For the operations listed below, use `@expo/agent-cli` in place of the equivalent commands elsewhere in this file or in loaded skills. Package installation still uses Expo’s SDK-compatible version resolution. Use `bunx` instead of `npx` when `bun.lock` is present.

Most commands take `--json` for a machine-readable report.

- `npx @expo/agent-cli status` — where the project is right now, and what would happen next: which sources changed since the last build, whether an update can ship over the air, and whether EAS already has a build for this fingerprint
- `npx @expo/agent-cli status --json` — the same report as one object, with the raw project probe under `probe`
- `npx @expo/agent-cli status --assert js-only` — a gate on what a change costs: exit 20 when it costs more than the class named, 22 when nothing could be measured, 0 otherwise
- `npx @expo/agent-cli dev --android` — get the app onto that platform's device: it prints the plan, then runs it. The platform flag (--ios, --android, --web) is required; add --plan to print the steps without running them
- `npx @expo/agent-cli start` — `expo start` and nothing else: a dev server no planning may touch
- `npx @expo/agent-cli install <pkg>` — install a package and report what it changes natively
- `npx @expo/agent-cli install --fix` — fix incompatible package versions using Expo's SDK-compatible version resolution
- `npx @expo/agent-cli lint` — run the project's Expo lint command
- `npx @expo/agent-cli doctor` — diagnose dependency and configuration issues with expo-doctor
- `npx @expo/agent-cli typecheck` — run the TypeScript compiler of this project as a gate: exit 20 with the diagnostics, exit 0 when there are none. A bundle that builds and an app that does not throw do not cover this.
- `npx @expo/agent-cli runtime:eval <js>` — evaluate JavaScript in the running app
- `npx @expo/agent-cli runtime:errors` — collect the runtime errors of the running app
- `npx @expo/agent-cli navigate <route>` — open a route as a deep link on a device
- `npx @expo/agent-cli runtime:tree` — what is on the screen of the running app, by testID
- `npx @expo/agent-cli runtime:tap <testID>` — tap an element; `--verify` reports what changed
- `npx @expo/agent-cli runtime:type <text> --testID <id>` — type into an input
- `npx @expo/agent-cli skills:list` — the agent skills the installed packages ship
- `npx @expo/agent-cli new <dir>` / `npx @expo/agent-cli deploy` — create a project headlessly / deploy web and native
- `npx @expo/agent-cli smoke --android` — the whole gate in one command: the dev server bundles, the app is up, and nothing threw

## Expo docs

The full Expo docs for this project’s SDK can be local Markdown files.
- `npx @expo/agent-cli docs:sync` downloads them and prints two directories: all docs, and this SDK’s API reference. Grep those directories.
- `npx @expo/agent-cli docs:search <query>` returns ranked pages with file paths and line numbers.
Links in the docs point to `https://docs.expo.dev/<path>.md`. To read one locally, open `<path>.md` in the docs directory that `docs:sync` printed.
Prefer the local docs over web fetches of docs.expo.dev.

## Devices

Run `npx @expo/agent-cli dev` before `navigate`, `runtime:reload` or `runtime:stop`, or they refuse with `NO_BOUND_DEVICE` and name the command. Never boot, shut down or delete a simulator named `agent-cli …` yourself, and never kill an emulator instance started with `-read-only`; it may be bound to another worktree.

## Expo skills

For Expo or EAS work, start with the `expo-overview` skill when it is available in your agent’s skill list. It routes your goal to the relevant Expo or EAS skill. Then read any matching package skills listed below for guidance specific to the installed packages.

<!-- BEGIN EXPO PACKAGE SKILLS -->
## Package skills

No linked package skills are available.

Run `npx @expo/agent-cli skills:sync` after changing dependencies to refresh this index. Run `npx @expo/agent-cli skills:list` to see available package skills.
<!-- END EXPO PACKAGE SKILLS -->

Commands end with a `Suggested next:` section — suggested follow-up commands, not required steps. Run one only when it serves your current goal.
<!-- END EXPO AGENT CLI MANAGED BLOCK -->
