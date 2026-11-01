# CitizenSignal project status

Reviewed 2026-11-01 from the repository and the existing QA logs.

Status key:

- [x] Working check recorded in the earlier checklist or QA log. These checks were not rerun during this documentation update.
- [~] Source or configuration is present, but a working end-to-end check is not recorded.
- [ ] Still needs implementation, environment setup, or validation.

## Backend

- [x] Required backend packages are installed and used: Zod, Multer, Sharp, Geolib, and string-similarity.
- [x] Supabase schema covers issues, evidence, upvotes, comments, indexes, and the issue-images bucket.
- [~] API routes are implemented for health, email and password login, nearby and personal issue lists, issue detail, reports, matching, upvotes, comments, and admin status changes.
- [~] Recheck email/password registration and sign-in with the Email provider enabled. The old checklist records a live pass, while a backend QA note says the provider-enabled success path still needed verification.
- [x] Matching supports creation, merge, uncertain-match confirmation, and reopening resolved issues.
- [x] Priority is calculated by the shared service when issues are read.
- [x] Backend smoke checks, including comments and admin flows, passed against the configured Supabase project in the latest backend QA notes.
- [x] Seed script creates repeatable sample issues and photos.
- [~] Apply the schema and configure the storage bucket, Email provider, and server secrets for each new Supabase project.
- [~] Run the server against the target environment and confirm the health route is reachable from the intended phone or client.

## Frontend

- [~] Expo Router app, API client, TanStack Query hooks, mock fixtures, email and password login, map, reporting, issue detail, search, personal issues, comments, settings, and admin screens are present in source; the complete app flow is not recorded as phone-verified.
- [x] Photo selection, image shrinking, and multipart upload were verified on two Android phones in Expo Go, according to the frontend QA log.
- [x] TypeScript and Android bundle checks passed for the admin screen and pull-to-refresh changes, according to the frontend QA log.
- [~] Verify login and session restoration on a real Android phone with the Email provider enabled.
- [~] Verify the full report, duplicate confirmation, merge, reopen, upvote, comment, and personal-issues flows against a live backend on a phone.
- [~] Verify the admin menu and status changes on a phone; the latest frontend QA note records that this was not yet checked on-device.
- [~] Verify location-denied and manual-pin behavior on a phone.

## Setup and maintenance

- [ ] Configure frontend and backend environment files for the target deployment. Keep the service-role key on the server only.
- [ ] Run the seed command only against a development database; it clears existing issue data and stored photos.
- [ ] Repeat backend and frontend type checks and the backend smoke suite after the next application-code change.
- [ ] Decide whether to implement email ownership verification before opening account creation to the public.

## Current notes

This update changes documentation only. No application tests were run during this review. Status reflects source inspection and earlier checklist or QA records; device and environment checks without recorded results remain marked for validation.
