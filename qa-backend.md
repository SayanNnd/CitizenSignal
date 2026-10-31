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
