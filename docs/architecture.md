# Launch Lane

A neighborhood marketplace connecting Mercer Crossing students with nearby residents who need local services or help with jobs.

## Run & Operate

- `pnpm dev` — run the API (port 3001) and the site (http://localhost:5173, forwards /api to the API)
- `pnpm test` — authorization and photo-format tests
- `E2E_DATABASE_URL=… tests/e2e/run.sh` — end-to-end API test (accounts, photos, businesses, guardian links, openings, resident jobs, chat) against a throwaway local Postgres
- `pnpm run vercel-build` — build the Vercel output (`.vercel/output`) exactly as Vercel does
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (Neon pooled URL in production); `ADMIN_EMAIL` — the founder account used for administrator access; `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (optional on Vercel, copied from the first) and `CLERK_SECRET_KEY`; `BLOB_READ_WRITE_TOKEN` on Vercel (Vercel Blob, set automatically when a Blob store is connected). See `.env.example`.
- Optional email env: `RESEND_API_KEY` and `NOTIFY_FROM`; without a Resend key, email attempts are logged for administrator testing
- Optional URL env: `PUBLIC_APP_URL` — canonical base URL for guardian approval links; it must use `launch-laneco.com` / `www.launch-laneco.com`, localhost, or this Vercel project's own deployment hosts (`VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`)

## Stack

- Hosting: Vercel (Build Output API — static site + one Node function for `/api/*`, see `scripts/vercel-build.mjs`)
- Database: Neon Postgres; photos: Vercel Blob (private); sign-in: Clerk; email: Resend
- pnpm workspaces, Node.js 22+, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/launch-lane/src/pages/` — public pages and route components
- `artifacts/launch-lane/src/components/` — shared site UI, booking panels, job posting/dashboard panels, chat components, and live listing cards
- `artifacts/launch-lane/src/data/` — FAQ, steps, and the shared category list
- `artifacts/launch-lane/src/globals.css` — Launch Lane colors, fonts, and page styling
- `artifacts/launch-lane/public/` — logo and site image assets
- `artifacts/api-server/src/routes/` — auth, business, booking, job, guardian, chat, moderation, storage, and health APIs
- `artifacts/api-server/src/lib/` — authorization helpers, site settings, and email delivery/logging
- `lib/db/src/schema/` — PostgreSQL/Drizzle tables for accounts, profiles, businesses, bookings, jobs, applications, guardian approvals, chats, and email logs
- `docs/launch-lane-spec.md` — product requirements and phased build plan
- `.migration-backup/` — historical Next.js source; not used to run the app

## Architecture decisions

- Clerk provides branded Google and email-code sign-in so visitors need no other account; the verified Clerk session is the identity source.
- The only administrator is the database account whose verified Clerk email matches the `ADMIN_EMAIL` secret. Registration accepts `student`, `resident`, or `guardian`; the server derives admin status from the secret.
- Every protected API request resolves the account from the verified Clerk session and checks role and ownership on the server. Browser-provided roles and owner IDs are not authorization inputs.
- A guardian's verified email is matched case-insensitively against student profile guardian emails; no browser-provided email or student ID grants access.
- Job applications stay hidden from residents until the administrator approves them. Rejection reasons are visible only to the student and administrator.
- Chat threads are created only after a booking is accepted or a job is filled after guardian approval. Students, their guardian, and the resident are participants; administrators can read and moderate all threads.
- Chat is plain text only, messages are limited to 1,000 characters, unread email reminders are throttled by thread and recipient, and message content is never included in chat-notification emails.
- Public business routes expose only approved businesses; public job routes expose open jobs and only a resident's street name. Full addresses, guardian details, and student email remain private.
- Guardian approval URLs prefer `PUBLIC_APP_URL` when set; otherwise they use the request host, and both paths enforce the same explicit host allowlist.
- Guardian approval records are single-use and polymorphic: business approval and job-application approval share the same table with distinct target types.
- Business photos are resized in the browser before upload to the API, which checks the WebP header and size (`lib/webp.ts`) and stores them privately in Vercel Blob (`lib/photo-storage.ts`; local disk in development). `/api/storage/objects/*` serves photos of live businesses publicly and in-review photos only to their owner and the admin.
- Email delivery falls back to a database-backed administrator-only log when Resend is not configured; only the latest 500 attempts are retained.

## Product

- Launch Lane serves Mercer Crossing in Farmers Branch, Texas.
- Students ages 13–18 can offer local services or apply for resident-posted jobs.
- Residents can find student services or post local jobs.
- Parents and guardians can see linked students' business, booking, job-application, and chat summaries.
- The founder reviews new businesses and jobs; students manage their own businesses and bookings.
- Launch Lane takes no cut and does not collect payments; residents and students arrange payment directly.

## Phase 7 implementation

- Job applications begin as `pending_review`; only applications approved by the administrator appear to residents as `applied`.
- Guardian accounts link to students through a case-insensitive match between the verified Clerk email and the guardian email on the student profile.
- Booking chats start when a student accepts a booking; job chats start only after guardian approval fills the job. Each thread includes the student, guardian, and resident, while the administrator can read and moderate all threads.
- Chat messages are plain text, limited to 1,000 characters, rate-limited, and email notifications contain a thread link but never message text.
- Terms and Privacy pages are placeholders for founder review. The privacy page describes the collected profile, address, photo, and chat data and explains the deletion-request contact.
- The administrator email log is database-backed and retains the latest 500 attempts.

## Business logos

- A business can have one optional logo (`businesses.logo_path`). It is uploaded and checked exactly like photos (private WebP, ≤210 KB, the owner's own upload) and served by `/api/storage/objects/*` publicly only while the business is live; owner and admin can see it during review. Logos display uncropped on a white tile.

## Business openings

- A student whose business is live can post an opening (a role at their business). It is a row in `jobs` with `business_id` set; `resident_id` is the poster (the student owner).
- Openings follow the job rules: the administrator approves the opening before it is public, every application goes to the administrator first (`pending_review`), then to the owner, and the applicant's guardian approves by single-use link before the applicant joins. Only students can apply, and an owner cannot apply to their own opening. Openings disappear from Explore when the business is not live.
- Every application asks whether the student has another job (and its details) and their availability; with the age from the profile, these go to the administrator and then to the poster. Applicant emails and addresses are never shown to posters.
- Emails to a student owner copy the owner's guardian. The opening's group chat includes the applicant, the applicant's guardian, the owner and the owner's guardian; the administrator can read and moderate it.

## Rules

- The only administrator is the account matching the `ADMIN_EMAIL` secret; users cannot assign themselves admin.
- Review student and resident addresses before their first business or job goes live.
- A student's business requires administrator approval and then guardian approval; job acceptance also requires guardian approval.
- Copy a student's guardian on every email sent to that student through Launch Lane.
- Never collect phone numbers or expose full home addresses or student emails publicly. Public job listings show only a street name and “Mercer Crossing”.
- Check the signed-in user's role and ownership on every server-side read and write. Never trust a role or ID from the browser.
- Guardian dashboard and chat access require the server-verified session email to match a guardian email stored on the student's profile.
- Never return full addresses, student email, or guardian email from public routes. Chat APIs expose only participant names, roles, and message text.
- Keep public forms rate-limited and retain the hidden `website` spam-trap field.
- Never add payment collection. Do not publish or connect a custom domain until the user approves.
- Store credentials only in Vercel environment variables (or a local `.env`, which is git-ignored), never in source code.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Update `lib/api-spec/openapi.yaml`, then run API codegen after changing an API contract; generated client hooks and Zod schemas are checked into the workspace.
- After changing Drizzle tables, run `pnpm --filter @workspace/db run push` against development only, then typecheck and build.
- Do not add full addresses, guardian emails, or student emails to public response schemas, page props, or general server logs. Admin-only endpoints and the database-backed email log may include private details after server-side admin checks.
- A guardian's job-application approval fills the job and declines other applications; a decline leaves the job open so the resident can choose another applicant.
- `PUBLIC_APP_URL` is accepted only for the approved Launch Lane domains, localhost, or this project's own Vercel hosts; never loosen the host allowlist to accommodate an arbitrary request host.
- Keep the original page wording/design when changing workflows. The job and booking forms are authenticated actions, not the old email-only sample submission flow.
- New job applications must begin as `pending_review`; only approved `applied` applications appear to the resident. Keep the review decision and resident notification in sync.
- Chat participant checks must use the authenticated database account; guardian access uses a case-insensitive verified-email match. Never accept participant IDs from request bodies.
- Create booking chat threads inside the booking-accept transaction and job chat threads inside the guardian-approval transaction, so neither can exist without its qualifying state change.
- Keep message emails content-free and enforce the one-per-hour throttle in the database transaction, not only in the browser.
- The `/admin/email-log` route is administrator-only and reads persisted rows; cleanup keeps the 500 most recent attempts.
- Phase 7 requirements and user-facing checks are recorded in `docs/launch-lane-spec.md`.

## Pointers

- `README.md` — setup steps for Neon, Clerk, Vercel Blob, Resend and Vercel
- The in-memory rate limits (guardian links, chat) are per serverless instance on Vercel, so they are looser than on a single server; the database-enforced chat email throttle is unaffected.
