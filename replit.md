# Launch Lane

A neighborhood marketplace connecting Mercer Crossing students with nearby residents who need local services or help with jobs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/launch-lane/src/pages/` — public pages and route components
- `artifacts/launch-lane/src/components/` — shared site header, footer, forms, and listing components
- `artifacts/launch-lane/src/data/` — FAQ, steps, categories, and current sample listings
- `artifacts/launch-lane/src/globals.css` — Launch Lane colors, fonts, and page styling
- `artifacts/launch-lane/public/` — logo and site image assets
- `artifacts/api-server/src/routes/` — API endpoints, including health and form submission
- `artifacts/api-server/src/lib/` — form validation, site settings, listing references, and email delivery
- `lib/db/src/schema/` — PostgreSQL/Drizzle schema
- `docs/launch-lane-spec.md` — product requirements and phased build plan
- `.migration-backup/` — preserved imported Next.js source

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

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

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
