# Launch Lane: build spec for Replit Agent

Read this whole file before changing anything. Build in the phases at the bottom, and stop for review
after each one. If something here is unclear or conflicts with what the code already does, ask instead of guessing.

## 1. What Launch Lane is

A neighborhood marketplace for **Mercer Crossing, Farmers Branch, Texas** only.

- **Students** (18 or under, living in Mercer Crossing) list a service or small business: bin cleaning, lawn care,
  babysitting, pet care, digital support, hauling, tutoring, others. They can also apply for jobs residents post.
- **Residents** (living in Mercer Crossing) book student services or post jobs.
- **Admin** (the founder, Viraj) approves new businesses and job posts. After approval, each student runs their own
  business from their own dashboard. The admin does **not** manage bookings day to day.
- Launch Lane takes **no cut** and handles **no payments**. Students and residents agree on price and payment directly.
  Do not add any payment collection to the site.

## 2. What already exists (keep it)

This repo is a working Next.js (App Router) site. Keep its pages, wording, design and URLs.

| Keep | Where |
|---|---|
| Pages: `/`, `/how-it-works`, `/explore`, `/students`, `/residents`, `/about`, `/faq`, `/login`, `/signup` | `app/` |
| Redirects from old URLs | `next.config.mjs` |
| Site name, community, contact email, header tabs | `lib/site.js` |
| FAQ text, step text, categories | `data/faq.js`, `data/steps.js`, `data/listings.js` (`categories`) |
| Design: Alfa Slab One headings, Figtree body, teal/mint/gold/cream colors | `app/globals.css`, `app/layout.jsx` |
| Logo and icons | `public/logo.png`, `public/logo-mark.png`, `app/icon.png` |
| Form field definitions and email wording | `lib/forms.js` |
| Email sending through Resend's HTTP API | `lib/notify.js`, `app/api/submit/route.js` |

Do not rewrite the page copy. It's the founder's own wording.

**Replace:**
- `data/listings.js` sample listings → real data from the database (keep `categories`).
- Firebase sign-in (`lib/firebase.js`, `lib/firebase-config.js`, `components/GoogleSignIn.jsx`, `firestore.rules`)
  → Replit Auth, or Clerk Auth if Replit Auth can't do what section 4 needs. Remove the `firebase` package and the
  `overrides` entry for `@grpc/grpc-js` in `package.json` once Firebase is gone.
- `.devcontainer/` can be deleted.

## 3. Data (Replit Database / Postgres)

Suggested tables. Adjust names if needed, but keep the meaning.

- **users**: id, auth_id, name, email, role (`admin` | `student` | `resident`), created_at.
- **student_profiles**: user_id, age, home_address (private), guardian_name, guardian_email.
- **resident_profiles**: user_id, home_address (private), street_name (public).
- **businesses**: id, owner_id → users, name, category (from `categories`), description, pricing_text, photos (≤ 3),
  status (`pending_review` | `pending_guardian` | `live` | `paused` | `rejected`), rejection_reason, created_at,
  approved_at.
- **bookings**: id, business_id, resident_id, message, preferred_timing, status (`requested` | `accepted` |
  `declined` | `completed` | `cancelled`), created_at, updated_at.
- **jobs**: id, poster_id → users (resident), title, category, description, timing, pay_text, status
  (`pending_review` | `open` | `filled` | `closed` | `rejected`), created_at.
- **job_applications**: id, job_id, student_id, message, status (`applied` | `chosen` | `guardian_approved` |
  `declined` | `withdrawn`), created_at.
- **guardian_approvals**: id, type (`business` | `job_application`), target_id, guardian_email, token (random, single
  use), expires_at, decided (`approved` | `declined` | null), decided_at.

Only one admin account: the email set in an `ADMIN_EMAIL` secret. Never let anyone make themselves admin.

## 4. Accounts and sign-in

- Users must be able to sign in with **Google**, and the sign-in screen should be branded Launch Lane. Don't require
  a Replit account. If Replit Auth requires one, use Clerk Auth instead.
- `/signup` keeps its "I am a Student / Resident" choice and saves the role.
- After sign-up, students complete a profile (age 10–18, home address, guardian name + email). Residents give
  their home address.
- The header shows "Log in" when signed out, and the person's first name + a dashboard link + "Sign out" when signed in.

## 5. Rules that must always hold

1. **Mercer Crossing only.** Every student and resident address is reviewed by the admin before their first business
   or job goes live. (Manual review is fine. No automatic address checking needed yet.)
2. **Guardian approval.** A student's business goes live only after (a) admin approval and then (b) the guardian
   approves through a single-use emailed link. A student can accept a resident's job only after their guardian
   approves that specific job through an emailed link.
3. **Guardians are copied.** Every email sent to a student through Launch Lane (new booking, message, job decision)
   is also sent to their guardian.
4. **Privacy.** Phone numbers are never collected. Full home addresses are never shown publicly or to other users.
   Residents' listings/jobs show only their street name + "Mercer Crossing". Students' contact emails aren't shown
   publicly; residents contact students through booking requests.
5. **Authorization on the server.** Check the signed-in user's role and ownership on every read and write in server
   code. Never trust a role or ID sent from the browser.
6. Keep the spam trap (hidden `website` field) and add basic rate limiting on public forms.

## 6. What each role can do

**Admin (`/admin`)**
- Queue of new businesses and job posts: see the details, including the private address; Approve or Reject (with a reason).
- Pause or unpublish any business or job.
- That's all. No booking management.

**Student owner (`/dashboard`)**
- Create a business (goes to `pending_review`), edit its description, pricing text and photos.
  Edits go live immediately; changing the business name or category sends it back to `pending_review`.
- Pause or unpause their business.
- See incoming booking requests; Accept, Decline, or Mark completed.
- See their job applications and their statuses.

**Resident (`/dashboard`)**
- Book a live business (from the existing "Book" button on `/explore`): message + preferred timing.
- Post a job (from `/residents`): goes to `pending_review`.
- See their bookings and their statuses.
- For their open jobs: see applicants, choose one. The chosen student's guardian then gets an approval email. When
  the guardian approves, the job becomes `filled` and both sides are notified.

**Public**
- `/explore` lists only `live` businesses and `open` jobs, with the existing search, tabs and category filter.

## 7. Emails (Resend)

Send from `NOTIFY_FROM` (e.g. `Launch Lane <notifications@launch-laneco.com>`). The admin inbox is
`contact@launch-laneco.com` (from `lib/site.js`). Set reply-to to the relevant person when it makes sense.

| Event | To |
|---|---|
| New business or job submitted | Admin |
| Business approved by admin | Guardian (with approve/decline link), student |
| Guardian approved business → live | Student + guardian |
| Business or job rejected | Owner (+ guardian if student), with reason |
| New booking request | Student owner + guardian |
| Booking accepted / declined | Resident |
| Student applied to a job | Resident |
| Resident chose a student | Guardian (approve/decline link), student |
| Guardian approved job | Resident, student + guardian |

Resend's free plan allows 100 emails a day, and each guardian copy counts as one. Keep emails short and plain.

## 8. Photos

Up to 3 photos per business. Resize to at most 1600 px wide and compress (target ~200 KB) before storing.
Images only (JPEG/PNG/WebP), no video. Store in Replit App Storage.

## 9. Secrets

`RESEND_API_KEY`, `NOTIFY_FROM`, `ADMIN_EMAIL`, plus whatever the auth provider needs. Never put secrets in code.

## 10. Phases (stop for review after each)

1. **Run the existing site on Replit** unchanged. Confirm every page and redirect works.
2. **Auth + roles**: Google sign-in, sign-up with role, profiles, header state, `ADMIN_EMAIL` admin.
3. **Businesses**: create/edit/photos, admin approval, guardian approval link, `/explore` reads real data.
4. **Bookings**: Book button → booking request → owner dashboard accept/decline/complete, emails.
5. **Jobs**: post → admin approval → applications → resident chooses → guardian approval, emails.
6. **Polish + checks**: remove sample data and Firebase code, test each role end to end with test accounts,
   check phone-width layouts, confirm no private address or email leaks into any public page or API response.

## 11. Going live

Keep the current site live at launch-laneco.com (hosted on Vercel) until phase 6 passes. Then add the custom domain
in Replit's deployment settings, swap the DNS records at Northwest Registered Agent to the ones Replit gives (replacing
the Vercel A/CNAME records only; don't touch the email/MX or Resend records), and confirm the site loads before
removing the Vercel project.
