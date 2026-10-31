# CitizenSignal

CitizenSignal is a map of broken things in your neighbourhood. You take a photo of a pothole, a dead streetlight or an overflowing bin, and the app pins it to where you are standing. Other people can upvote it, add their own photos and talk about it underneath.

The part we care most about is what happens when two people report the same problem, or when something that was "fixed" breaks again. Instead of piling up ten separate complaints, CitizenSignal works out that they are the same issue and merges them. If the issue had already been marked as fixed, it gets reopened and its history is kept, so nobody can quietly close a problem that keeps coming back.

We built it at a hackathon in about five hours, so treat it as a working prototype rather than a finished product.

## Why we built it

Anyone who has tried to report a civic problem knows the pattern. The same pothole gets reported over and over as separate tickets, which hides how many people it actually affects. Then it gets patched, marked as resolved, breaks again a week later, and the next report starts from zero as if it never happened.

We wanted three things:

- One issue per real-world problem, no matter how many people report it.
- A memory of what was fixed and when, so repeat failures are visible.
- A simple sense of urgency, so the problems that matter most to residents rise to the top.

## What it does

- **Map and feed of nearby issues.** The home screen is a map with a draggable list underneath, showing open issues around you, most urgent first.
- **Reporting with a photo.** Pick a category, write a sentence or two, take or choose a photo, and adjust the pin if needed. You don't need an account to report.
- **Duplicate detection.** When you report something, the server compares it with nearby issues of the same type. If it is clearly the same, your report is added to the existing issue. If it might be the same, the app asks you before saving anything.
- **Reopening fixed issues.** If your report matches an issue that was marked as fixed, that issue is reopened and flagged as having come back, instead of a new one being created.
- **Priority and severity.** Every issue has a priority score that grows with upvotes, extra reports, repeat failures and time spent waiting. In the app it shows up as a small yellow, orange or red triangle.
- **Issue page.** A large photo, the full description, upvotes, a timeline of every report and the date it was fixed, and a comment thread.
- **Search.** Look up a place to see issues there, or search the issues near you. The map moves to whatever you pick.
- **Google sign-in.** Only needed to upvote and comment. Browsing and reporting work without signing in.
- **Your Issues.** Everything you reported, or added a report to, in one list.
- **Light and dark themes**, including matching map styles.

## How duplicate detection works

Every new report goes through the same steps on the server (`backend/src/services/matching.service.ts`):

1. Look up issues in the same category within roughly 75 m, using a bounding box in the database.
2. Measure the exact distance to each one with Geolib and drop anything further than 50 m.
3. Normalise both descriptions (lowercase, no punctuation) and score how similar they are with string-similarity, which uses the Dice coefficient.
4. Decide what to do with the best match:

| Situation | What happens |
|---|---|
| Text at least 75% similar and within 25 m | Merged into the existing issue as extra evidence. If that issue was fixed, it is reopened and its recurrence count goes up. |
| Text at least 50% similar and within 50 m | Nothing is saved yet. The app shows up to three candidates and asks "Is this the same issue?" |
| Nothing close enough | A new issue is created. |

All of these numbers live in one file, `backend/src/config/matching.ts`, so they can be tuned without touching the logic. Fixed issues are always included as candidates, because catching a problem that came back is the whole point.

## How priority is calculated

Priority is worked out every time issues are read, so it is always current and there is no background job to maintain:

```
priority = 2 × upvotes + 1 × reports + 5 × times it came back + 1.5 × days open
```

Days open counts from when the issue was created, or from when it was last reopened. A fixed issue has zero days open. The weights are our first guess and sit in `backend/src/services/priority.service.ts`.

## Tech stack

**App** (`frontend/`)
- React Native with Expo, targeting Android through Expo Go
- TypeScript, Expo Router for screens, TanStack Query for server data
- react-native-maps, expo-location, expo-image-picker and expo-image-manipulator
- Supabase JS for sign-in, with Google through a browser OAuth flow

**Server** (`backend/`)
- Node 24 and Express 5, written in TypeScript and run with tsx
- Supabase for the Postgres database, photo storage and auth
- Zod to validate every request
- Multer to receive the uploaded photo
- Sharp to rotate, resize and convert photos to WebP before storing them
- Geolib to measure distances
- string-similarity to compare descriptions

The app and the server are completely separate. They share no code and only talk to each other through the HTTP API described in `roadmap.md`.

## Project layout

```
CitizenSignal/
  backend/
    sql/schema.sql          tables, indexes and storage notes
    scripts/seed.ts         resets the demo data
    scripts/smoke.ts        end-to-end test of every write path
    src/
      config/               environment, Supabase client, matching thresholds
      middleware/           auth, photo upload, error formatting
      routes/ controllers/  HTTP layer
      services/             matching, priority, images, database access
  frontend/
    app/                    screens (map, search, report, issue, login, settings)
    src/
      api/                  one function per endpoint, plus mock data
      components/           feed rows, map buttons, sheets, icons
      constants/theme.ts    colour palettes for light and dark mode
      location/             current location and selected area
  roadmap.md                decisions, API contract, database, demo script
  agents.md                 working rules for the team (and AI assistants)
  qa-frontend.md            why the app is built the way it is
  qa-backend.md             why the server is built the way it is
```

## Running it locally

You will need Node 24, an Android phone with Expo Go installed, and a Supabase project. The phone and your computer need to be on the same Wi-Fi network.

### 1. Set up Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `backend/sql/schema.sql`.
3. Under Authentication, enable the Google provider, and add `exp://**` to the allowed redirect URLs so sign-in can return to Expo Go.
4. While the Google consent screen is in testing mode, only accounts added as test users can sign in. Add the accounts you plan to use.

The photo bucket (`issue-images`) is created by the seed script if it doesn't exist yet.

### 2. Start the server

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=*
```

The service role key has full access to your database. Keep it on the server and never put it in the app.

```bash
npm run seed    # optional: loads demo issues, including one fixed pothole
npm run dev     # starts the server on port 4000
```

The server listens on every network interface, because a phone cannot reach `localhost` on your computer. Find your computer's local IP address (`ipconfig` on Windows, `ifconfig` on macOS or Linux) and open `http://<your-ip>:4000/api/health` in your phone's browser. If that page loads, the phone can reach the server. If it times out, check your firewall.

### 3. Start the app

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `frontend/.env`:

```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://<your-ip>:4000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Use the anon key here, not the service role key. Then start Expo and scan the QR code with Expo Go:

```bash
npx expo start -c
```

The `-c` clears the cache, which you need whenever you change `.env`.

### Trying the app without a server

If you only want to look at the app, leave `EXPO_PUBLIC_USE_MOCK=true` (the default). The app then uses built-in sample data that behaves like the real API, including duplicate detection, reopening, upvotes and comments, and needs no server at all. Sign-in is still real if the Supabase values are filled in, and falls back to a fake account if they aren't.

## The API in brief

Everything lives under `/api`. The full contract, including every field and error code, is in section 4 of `roadmap.md`.

| Method | Path | Sign-in | What it does |
|---|---|---|---|
| GET | `/health` | no | Checks the server is up |
| GET | `/issues?lat=&lng=&radius_m=` | optional | Nearby issues, highest priority first. Also accepts `q`, `category` and `status`. |
| GET | `/issues/mine` | required | Issues you reported or added a report to |
| GET | `/issues/:id` | optional | One issue with all of its reports |
| POST | `/issues` | optional | Report an issue (multipart form with a photo). Runs duplicate detection. |
| POST / DELETE | `/issues/:id/upvote` | required | Add or remove your upvote |
| GET | `/issues/:id/comments` | optional | Comments, oldest first |
| POST | `/issues/:id/comments` | required | Add a comment |

## Checking your changes

```bash
cd backend && npx tsc --noEmit     # type check the server
cd frontend && npx tsc --noEmit    # type check the app
cd backend && npm run smoke        # with the server running: exercises every write path
```

The smoke test works in an empty spot of the South Pacific, uses a throwaway account, and deletes everything it created when it finishes, so it is safe to run against the demo database.

## Known limitations

We would rather be upfront about these:

- **Android only.** We only tested on Android through Expo Go. iOS was out of scope.
- **Only the latest fix date is stored.** If an issue is fixed, breaks, and is fixed again, the timeline shows only the most recent fix.
- **The thresholds are hand-tuned.** The matching thresholds and priority weights are sensible starting points, not values backed by real data.
- **Google sign-in is limited to test users** while the consent screen is in testing mode.
- **Search runs in the app.** It filters the issues already loaded nearby rather than querying the server.
- **No admin tools.** Issues are marked as fixed directly in the Supabase dashboard.
- **string-similarity is deprecated on npm.** We pinned it at 4.0.4 because it still works well for this.

## What we would do next

- Keep a full history of fixes, so repeat failures are easy to see at a glance
- A simple dashboard for city staff to triage and close issues
- Notify people when an issue they reported is fixed, or comes back
- Use the server-side search for places outside the current area
- iOS support

## Documentation

- `roadmap.md` covers the decisions we locked in, the API contract, the database schema and the demo script.
- `agents.md` lists the working rules for anyone, person or AI assistant, changing the code.
- `qa-frontend.md` and `qa-backend.md` explain why things are built the way they are, written for anyone who asks "why did you do it like this?"

## License

See `LICENSE`.
