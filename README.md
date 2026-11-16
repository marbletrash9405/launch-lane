# Launch Lane

Helping students earn. Helping neighbors get things done.

A neighborhood board where Mercer Crossing students (18 & under) list services and residents post requests. Built with Next.js; deploys to Vercel with no extra configuration.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: intro, "Work, your way" categories, two ways to use it, latest listings, safety, FAQ preview |
| `/explore` | Student services and neighborhood jobs, with search, type tabs and category filter |
| `/students` | For students: steps and the "offer a service" application form (`#apply`) |
| `/hirers` | For neighbors: steps and the "post a job" form (`#post-a-job`) |
| `/how-it-works` | Both sides' steps, plus "Before you agree to a job" (safety, insurance, payment, liability) |
| `/our-story` | Mission, how it started, ethos, team and numbers (team/numbers are placeholders) |
| `/faq` | All FAQs, grouped |
| `/login` | Placeholder: accounts aren't built yet |

Old addresses (`/listings`, `/apply`, `/request`, `/about`) redirect to the new pages.

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
- **Listings:** `data/listings.js` (sample data right now — every name and email is a placeholder)
- **FAQ answers:** `data/faq.js`
- **Student / neighbor steps:** `data/steps.js`
- **Our story placeholders:** `app/our-story/page.jsx` — search for `[` to find each one
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
