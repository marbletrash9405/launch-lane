# Launch Lane

> Historical source archive only. The active app runs from `artifacts/launch-lane` with the API in
> `artifacts/api-server`. Do not use the old setup or deployment instructions below.

Helping students earn. Helping neighbors get things done.

A neighborhood board where Mercer Crossing students (18 & under) list services and residents post requests. Built with Next.js; deploys to Vercel with no extra configuration.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: intro, "Work, your way" categories, two ways to use it, sample listings, safety, FAQ preview |
| `/how-it-works` | Both sides' steps, plus "Before you agree to a job" (safety, insurance, payment, liability) |
| `/explore` | Explore Services: student services and neighborhood jobs, with Book / Apply buttons |
| `/students` | Students – Apply: steps and the application form (`#apply`) |
| `/residents` | Residents – Post a job: steps and the job form (`#post-a-job`) |
| `/about` | About us: mission, how it started (with a photo placeholder), ethos |
| `/faq` | All FAQs, grouped |
| `/login`, `/signup` | Legacy authentication pages; not used by the active app |

Old addresses (`/listings`, `/apply`, `/request`, `/hirers`, `/our-story`) redirect to the new pages.

## Where submissions go

Every student application, job post, booking request ("Book") and job application ("Apply") is emailed
to the Launch Lane inbox first — never straight to the other person. Lister emails stay on the server.
The email's reply-to is the person who submitted it, so you can just hit Reply.

Submissions go to **contact@launch-laneco.com** (set in `lib/site.js`; that's also the public
"Email us" address). To switch sending on (free):

1. Make sure contact@launch-laneco.com can actually receive mail (a mailbox or forwarding set up for
   the domain).
2. Sign up at **resend.com** and add `launch-laneco.com` under **Domains**. Add the DNS records Resend
   shows at Northwest Registered Agent (don't delete existing records), then click Verify.
3. In Resend → **API Keys** → create a key (Sending access).
4. In Vercel → launch-lane → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` = the key from step 3
   - `NOTIFY_FROM` = `Launch Lane <notifications@launch-laneco.com>`
5. Redeploy (Vercel → Deployments → ⋯ → Redeploy).

Shortcut while the domain isn't verified yet: skip `NOTIFY_FROM`. Emails then come from
`onboarding@resend.dev`, which Resend only delivers to the address you signed up to Resend with —
so sign up to Resend *as* contact@launch-laneco.com. Optional: `NOTIFY_EMAIL` sends submissions to a
different inbox instead (comma-separate for several).

Until these are set, the forms show "we can't accept submissions just yet".

## Authentication

The Firebase implementation was removed during the Replit migration. The active app uses Clerk;
see `replit.md` and `docs/launch-lane-spec.md` in the workspace root.

## Develop in the cloud (Codespaces)

A ready-made cloud dev machine is defined in `.devcontainer/devcontainer.json`.

1. On GitHub, open the repo → green **Code** button → **Codespaces** tab → **Create codespace on main**.
2. Wait for it to finish setting up (it runs `npm install` for you).
3. In the terminal at the bottom, run `npm run dev`. A preview of the site opens on port 3000.
4. Commit and push from the Source Control tab. Pushing to `main` updates the live site.

Stop the codespace when you're done (GitHub → Codespaces → ⋯ → Stop) so it doesn't use up the free monthly hours.

## Run it on your computer

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where to edit things

- **Logo:** `public/logo.png` (full logo, header), `public/logo-mark.png` (arrow only, footer), `app/icon.png` (browser tab icon). Replace a file with the same name to update it.
- **Site name, "for Mercer Crossing" line, tagline, contact email, header tabs:** `lib/site.js` (change `community` if Launch Lane expands)
- **Form fields and email wording:** `lib/forms.js`
- **Listings:** `data/listings.js` (sample data right now — every name and email is a placeholder)
- **FAQ answers:** `data/faq.js`
- **Student / neighbor steps:** `data/steps.js`
- **About us photo placeholder:** `app/about/page.jsx`
- **Colors and fonts:** top of `app/globals.css`

## Deploy to Vercel

**Option A — GitHub (recommended, auto-deploys on every push)**

1. Create an empty repo on GitHub (e.g. `launch-lane`).
2. In this folder:
   ```bash
   git remote add origin https://github.com/<your-username>/launch-lane.git
   git branch -M main
   git push -u origin main
   ```
3. Go to vercel.com → **Add New… → Project** → import the repo → **Deploy**. Vercel detects Next.js automatically; no settings to change.
4. Later, add your own domain under **Project → Settings → Domains**.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production
```

## Before going live

- **Forms don't save anything yet.** `components/DemoForm.jsx` shows a thank-you screen but sends nothing. Connect it to a form service (Formspree, Basin), a Google Sheet via Apps Script, or a database (Supabase, Vercel Postgres) plus a Next.js API route.
- **Address check and guardian signature** are described on the site but not built yet — they need the backend above.
- **Guardian email copies** need an email service (e.g. Resend) once contact goes through the site instead of plain `mailto:` links.
- Replace sample listings and write real Terms and Conditions.
