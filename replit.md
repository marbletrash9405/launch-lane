# Launch Lane

A neighborhood marketplace connecting Mercer Crossing students with nearby residents who need local services or help with jobs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `ADMIN_EMAIL` — the founder account used for administrator access
- Optional email env: `RESEND_API_KEY` and `NOTIFY_FROM`; without a Resend key, email attempts are logged for administrator testing
- Optional URL env: `PUBLIC_APP_URL` — canonical base URL for guardian approval links; it must use an approved Replit/local host or `launch-laneco.com` / `www.launch-laneco.com`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/launch-lane/src/pages/` — public pages and route components
- `artifacts/launch-lane/src/components/` — shared site UI, booking panels, job posting/dashboard panels, and live listing cards
- `artifacts/launch-lane/src/data/` — FAQ, steps, and the shared category list
- `artifacts/launch-lane/src/globals.css` — Launch Lane colors, fonts, and page styling
- `artifacts/launch-lane/public/` — logo and site image assets
- `artifacts/api-server/src/routes/` — auth, business, booking, job, guardian, moderation, storage, and health APIs
- `artifacts/api-server/src/lib/` — authorization helpers, site settings, and email delivery/logging
- `lib/db/src/schema/` — PostgreSQL/Drizzle tables for accounts, profiles, businesses, bookings, jobs, applications, and guardian approvals
- `docs/launch-lane-spec.md` — product requirements and phased build plan
- `.migration-backup/` — historical Next.js source; not used to run the app

## Architecture decisions

- Clerk handles Google sign-in so students and residents do not need Replit accounts; the verified Clerk session is the identity source.
- The only administrator is the database account whose verified Clerk email matches the `ADMIN_EMAIL` secret. Registration accepts only `student` or `resident`; the server derives admin status from the secret.
- Every protected API request resolves the account from the verified Clerk session and checks role and ownership on the server. Browser-provided roles and owner IDs are not authorization inputs.
- Public business routes expose only approved businesses; public job routes expose open jobs and only a resident's street name. Full addresses, guardian details, and student email remain private.
- Guardian approval URLs prefer `PUBLIC_APP_URL` when set; otherwise they use the request host, and both paths enforce the same explicit host allowlist.
- Guardian approval records are single-use and polymorphic: business approval and job-application approval share the same table with distinct target types.
- Business photos are resized in the browser before upload to Replit App Storage; public photo routes only serve approved business photos.
- Email delivery falls back to an admin-only log when Resend is not configured.

## Product

- Launch Lane serves Mercer Crossing in Farmers Branch, Texas.
- Students ages 13–18 can offer local services or apply for resident-posted jobs.
- Residents can find student services or post local jobs.
- The founder reviews new businesses and jobs; students manage their own businesses and bookings.
- Launch Lane takes no cut and does not collect payments; residents and students arrange payment directly.

## Rules

- The only administrator is the account matching the `ADMIN_EMAIL` secret; users cannot assign themselves admin.
- Review student and resident addresses before their first business or job goes live.
- A student's business requires administrator approval and then guardian approval; job acceptance also requires guardian approval.
- Copy a student's guardian on every email sent to that student through Launch Lane.
- Never collect phone numbers or expose full home addresses or student emails publicly. Public job listings show only a street name and “Mercer Crossing”.
- Check the signed-in user's role and ownership on every server-side read and write. Never trust a role or ID from the browser.
- Keep public forms rate-limited and retain the hidden `website` spam-trap field.
- Never add payment collection. Do not publish or connect a custom domain until the user approves.
- Store credentials only in Replit Secrets, never in source code.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Update `lib/api-spec/openapi.yaml`, then run API codegen after changing an API contract; generated client hooks and Zod schemas are checked into the workspace.
- After changing Drizzle tables, run `pnpm --filter @workspace/db run push` against development only, then typecheck and build.
- Do not add full addresses, guardian emails, or student emails to public response schemas, page props, or logs. Admin endpoints may include private details only after server-side admin checks.
- A guardian's job-application approval fills the job and declines other applications; a decline leaves the job open so the resident can choose another applicant.
- `PUBLIC_APP_URL` is accepted only for the approved Launch Lane domains or local/Replit hosts; never loosen the host allowlist to accommodate an arbitrary request host.
- Keep the original page wording/design when changing workflows. The job and booking forms are authenticated actions, not the old email-only sample submission flow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
