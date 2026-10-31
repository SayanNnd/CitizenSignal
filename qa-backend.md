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
