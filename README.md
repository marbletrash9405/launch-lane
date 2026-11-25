# Launch Lane

A neighborhood marketplace for Mercer Crossing (Farmers Branch, TX). Students ages 13–18 list services, post openings at their business, and apply for jobs and openings; residents book services and post jobs. The admin approves every business, job post and job application, a guardian approves each student business and job by emailed link, and families chat in the app. No payments and no cut.

Runs entirely on free tiers: **Vercel** (site + API), **Neon** (Postgres), **Vercel Blob** (photos), **Clerk** (sign-in), **Resend** (email).

How it's built and the rules it must keep: [`docs/architecture.md`](docs/architecture.md).

## One-time setup (about 20 minutes)

Do these in order. Every key goes into Vercel → your project → **Settings → Environment Variables** (all environments), never into the code.

1. **Database (Neon).** Vercel project → **Storage → Create → Neon (Postgres)** → Free plan → connect to this project. Vercel adds `DATABASE_URL` for you. The tables are created automatically on the first production deploy.
2. **Photos (Vercel Blob).** Vercel project → **Storage → Create → Blob** → set access to **Private** (this can't be changed later) → connect to this project. Vercel adds the Blob settings for you.
3. **Sign-in (Clerk).** Make a free account at [clerk.com](https://clerk.com) → **Create application** named "Launch Lane" → turn on **Google** and **Email** (email verification code) → **Create**. Then open **Configure → API keys** and add to Vercel:
   - `CLERK_PUBLISHABLE_KEY` = the `pk_test_…` key
   - `CLERK_SECRET_KEY` = the `sk_test_…` key
4. **Admin and website address.** Add to Vercel:
   - `ADMIN_EMAIL` = `launchlanecompany@gmail.com`
   - `PUBLIC_APP_URL` = the site's address (for now the `https://….vercel.app` address; later `https://launch-laneco.com`)
5. **Email (Resend).** At [resend.com](https://resend.com): **Domains → Add domain → launch-laneco.com**, add the DNS records it shows at Northwest Registered Agent, and wait for "Verified". Then **API Keys → Create** and add to Vercel:
   - `RESEND_API_KEY` = the `re_…` key
   - `NOTIFY_FROM` = `Launch Lane <notifications@launch-laneco.com>`

   Until this is done, emails aren't sent. They're saved in the **Email log** on `/admin`, so you can still test.
6. **Deploy.** Vercel → **Deployments → Redeploy** (or push to `main`).

Admin login: open the site, sign in with Google or an email code as `launchlanecompany@gmail.com`, then go to `/admin`.

### At launch (on launch-laneco.com)

- **Clerk production:** Clerk → **Create production instance** → domain `launch-laneco.com` → add its DNS records at Northwest → create a Google OAuth client in Google Cloud Console and paste it into Clerk's Google settings → replace the two Clerk keys in Vercel with the `pk_live_…` / `sk_live_…` keys. This removes the "Development mode" badge.
- **Domain:** Vercel → **Settings → Domains → add launch-laneco.com**, add the DNS records it shows, and set `PUBLIC_APP_URL=https://launch-laneco.com`.

## Working on the code locally

```bash
pnpm install
cp .env.example .env      # fill in DATABASE_URL and the Clerk keys
pnpm db:push              # create/update tables
pnpm dev                  # site at http://localhost:5173
```

Without `BLOB_READ_WRITE_TOKEN`, photos are saved in `./.local-uploads`. Without `RESEND_API_KEY`, emails go only to the admin email log.

Checks: `pnpm run typecheck`, `pnpm test`, `pnpm run vercel-build`, and the end-to-end test `E2E_DATABASE_URL=<throwaway local db> tests/e2e/run.sh`.
