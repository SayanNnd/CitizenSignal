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
