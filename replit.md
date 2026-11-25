# Launch Lane

A neighborhood marketplace connecting Mercer Crossing students with nearby residents who need local services or help with jobs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `ADMIN_EMAIL` — the founder account used for administrator access
- Email delivery: `RESEND_USE_CONNECTOR=true` uses the connected Resend account; `RESEND_API_KEY` remains supported for direct delivery outside Replit. `NOTIFY_FROM` must be a verified sender to email people other than the Resend account owner. Without either delivery option, emails are logged for administrator testing.
- Administrator review notifications (businesses, jobs, student job applications, and chat reports) go to `NOTIFY_EMAIL`, falling back to `ADMIN_EMAIL`, then the public contact inbox. Synthetic `.invalid` test recipients are logged only and never emailed.
- Optional URL env: `PUBLIC_APP_URL` — canonical base URL for guardian approval links; it must use an approved Replit/local host or `launch-laneco.com` / `www.launch-laneco.com`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
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
- `artifacts/api-server/src/scripts/seed-review-tests.ts` — manually run, idempotent synthetic review fixtures; never loaded at app startup. All fixtures start pending review. Approve test jobs before their applications; approving a test job makes it visible on Explore. Test accounts cannot sign in and their email is log-only.
- `lib/db/src/schema/` — PostgreSQL/Drizzle tables for accounts, profiles, businesses, bookings, jobs, applications, guardian approvals, chats, and email logs
- `docs/launch-lane-spec.md` — product requirements and phased build plan
- `.migration-backup/` — historical Next.js source; not used to run the app

## Architecture decisions

- Clerk provides branded Google and email-code sign-in so visitors do not need Replit accounts; the verified Clerk session is the identity source.
- The only administrator is the database account whose verified Clerk email matches the `ADMIN_EMAIL` secret. Registration accepts `student`, `resident`, or `guardian`; the server derives admin status from the secret.
- Every protected API request resolves the account from the verified Clerk session and checks role and ownership on the server. Browser-provided roles and owner IDs are not authorization inputs.
- A guardian's verified email is matched case-insensitively against student profile guardian emails; no browser-provided email or student ID grants access.
- Job applications stay hidden from residents until the administrator approves them. Rejection reasons are visible only to the student and administrator.
- Chat threads are created only after a booking is accepted or a job is filled after guardian approval. Students, their guardian, and the resident are participants; administrators can read and moderate all threads.
- Chat is plain text only, messages are limited to 1,000 characters, unread email reminders are throttled by thread and recipient, and message content is never included in chat-notification emails.
- Public business routes expose only approved businesses; public job routes expose open jobs and only a resident's street name. Full addresses, guardian details, and student email remain private.
- Guardian approval URLs prefer `PUBLIC_APP_URL` when set; otherwise they use the request host, and both paths enforce the same explicit host allowlist.
- Guardian approval records are single-use and polymorphic: business approval and job-application approval share the same table with distinct target types.
- Business photos are resized in the browser before upload to Replit App Storage; public photo routes only serve approved business photos.
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
- Store credentials only in Replit Secrets, never in source code.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Update `lib/api-spec/openapi.yaml`, then run API codegen after changing an API contract; generated client hooks and Zod schemas are checked into the workspace.
- After changing Drizzle tables, run `pnpm --filter @workspace/db run push` against development only, then typecheck and build.
- Do not add full addresses, guardian emails, or student emails to public response schemas, page props, or general server logs. Admin-only endpoints and the database-backed email log may include private details after server-side admin checks.
- A guardian's job-application approval fills the job and declines other applications; a decline leaves the job open so the resident can choose another applicant.
- `PUBLIC_APP_URL` is accepted only for the approved Launch Lane domains or local/Replit hosts; never loosen the host allowlist to accommodate an arbitrary request host.
- Keep the original page wording/design when changing workflows. The job and booking forms are authenticated actions, not the old email-only sample submission flow.
- New job applications must begin as `pending_review`; only approved `applied` applications appear to the resident. Keep the review decision and resident notification in sync.
- Chat participant checks must use the authenticated database account; guardian access uses a case-insensitive verified-email match. Never accept participant IDs from request bodies.
- Create booking chat threads inside the booking-accept transaction and job chat threads inside the guardian-approval transaction, so neither can exist without its qualifying state change.
- Keep message emails content-free and enforce the one-per-hour throttle in the database transaction, not only in the browser.
- The `/admin/email-log` route is administrator-only and reads persisted rows; cleanup keeps the 500 most recent attempts.
- Phase 7 requirements and user-facing checks are recorded in `docs/launch-lane-spec.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
