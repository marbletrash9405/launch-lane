You are building Launch Lane. Read this whole message before changing anything. Then:
(1) Save this message as docs/launch-lane-spec.md (overwrite the old spec; the old copy in .migration-backup/docs can stay).
(2) Fill in replit.md with the project name, a one-line description, the Product section, the Rules section, and a short "Where things live" map, so future sessions remember all of this.
(3) Build in the phases at the end. Stop after each phase, tell me what you built and how to test it, and wait for my OK. If anything is unclear or seems wrong, ask instead of guessing.

## What Launch Lane is
A neighborhood marketplace for Mercer Crossing in Farmers Branch, Texas ONLY.
- Students (ages 13–18 who live in Mercer Crossing) list a service or small business: bin cleaning, lawn care, babysitting, pet care, digital support, hauling, tutoring, others. They can also apply for jobs residents post.
- Residents (who live in Mercer Crossing) book student services or post jobs.
- Admin (the founder) approves new businesses and job posts. After approval, each student runs their own business from their own dashboard. The admin does NOT manage bookings day to day.
- Launch Lane takes no cut and handles no payments. Students and residents agree on price and payment directly. Never add payment collection.

## Keep what exists
The site was migrated from Next.js into this project (frontend in artifacts/launch-lane, API in artifacts/api-server). Keep every page, all wording, the design (Alfa Slab One headings, Figtree body, teal/mint/gold/cream colors), the logos, and the URLs: /, /how-it-works, /explore, /students, /residents, /about, /faq, /login, /signup, plus redirects from /listings, /apply, /request, /hirers, /our-story. Don't rewrite page copy; it's the founder's own wording. Keep the FAQ, steps and categories data. Keep the spam trap (hidden "website" field) on public forms.
Replace: the sample listings with real data from the database (keep the categories list), and any leftover Firebase sign-in code with the sign-in below.

## Accounts and sign-in
- Sign in with Google. The sign-in should be branded Launch Lane and must not require a Replit account. Use Replit Auth only if it meets that; otherwise use Clerk Auth.
- /signup keeps the "I am a Student / Resident" choice and saves the role.
- Students then complete a profile: age (13–18), home address, guardian name, guardian email. Residents give their home address.
- Exactly one admin: the account whose email matches the ADMIN_EMAIL secret. Nobody can make themselves admin.
- Header: "Log in" when signed out; first name + "Dashboard" + "Sign out" when signed in.

## Data (Postgres + Drizzle)
users (role: admin | student | resident), student_profiles (age, private home address, guardian name/email), resident_profiles (private home address, public street name), businesses (owner, name, category, description, pricing text, up to 3 photos, status: pending_review | pending_guardian | live | paused | rejected, rejection reason), bookings (business, resident, message, preferred timing, status: requested | accepted | declined | completed | cancelled), jobs (resident poster, title, category, description, timing, pay text, status: pending_review | open | filled | closed | rejected), job_applications (job, student, message, status: applied | chosen | guardian_approved | declined | withdrawn), guardian_approvals (type: business | job_application, target, guardian email, single-use random token, expiry, decision).

## Rules that must always hold
1. Mercer Crossing only: the admin reviews every student's and resident's address before their first business or job goes live (manual review is fine).
2. Guardian approval: a student's business goes live only after admin approval AND then the guardian approves through a single-use emailed link. A student can take a resident's job only after their guardian approves that specific job through an emailed link.
3. Guardians are copied on every email sent to their student through Launch Lane.
4. Privacy: never collect phone numbers. Never show full home addresses publicly or to other users. Jobs show only the resident's street name + "Mercer Crossing". Students' emails aren't shown publicly; residents reach students through booking requests.
5. Check the signed-in user's role and ownership on the server for every read and write. Never trust a role or ID sent from the browser.
6. Rate-limit public forms.

## What each role can do
Admin (/admin): a queue of new businesses and job posts with full details (including the private address); Approve or Reject with a reason; pause or unpublish any business or job. Nothing else.
Student (/dashboard): create a business (goes to pending_review); edit description, pricing text and photos (these go live immediately; changing the name or category sends it back to pending_review); pause or unpause it; see booking requests and Accept / Decline / Mark completed; see their job applications and statuses.
Resident (/dashboard): book a live business from the "Book" button on /explore (message + preferred timing); post a job from /residents (goes to pending_review); see their bookings and statuses; for their open jobs, see applicants and choose one. The chosen student's guardian gets an approval email; when they approve, the job becomes filled and both sides are notified.
Public: /explore shows only live businesses and open jobs, with the existing search, tabs and category filter.

## Emails (Resend, using the RESEND_API_KEY and NOTIFY_FROM secrets; admin inbox is contact@launch-laneco.com)
- New business or job submitted → admin
- Business approved by admin → guardian (with approve/decline link) + student
- Guardian approved → business live → student + guardian
- Business or job rejected → owner (+ guardian if student), with reason
- New booking request → student + guardian
- Booking accepted or declined → resident
- Student applied to a job → resident
- Resident chose a student → guardian (with approve/decline link) + student
- Guardian approved the job → resident, student + guardian
Keep emails short and plain. Resend's free plan allows 100 emails a day, and each guardian copy counts.

## Photos
Up to 3 per business; JPEG/PNG/WebP only, no video; resize to max 1600px wide and compress to about 200 KB before storing in Replit App Storage.

## Secrets
RESEND_API_KEY, NOTIFY_FROM, ADMIN_EMAIL, plus whatever sign-in needs. Never put secrets in code.

## Phases (stop after each one)
1. Done already: the site runs on Replit. Just do steps (1) and (2) above, confirm all pages and redirects still work, then stop.
2. Sign-in + roles: Google sign-in, sign-up with role, profiles, header, admin via ADMIN_EMAIL.
3. Businesses: create/edit/photos, admin approval, guardian approval link, /explore shows real live businesses.
4. Bookings: Book button → request → student dashboard accept/decline/complete, with emails.
5. Jobs: post → admin approval → applications → resident chooses → guardian approval, with emails.
6. Polish and checks: remove sample data and old Firebase code, test every role end to end with test accounts, check phone-width layouts, confirm no private address or email appears in any public page or API response, remove the "Made with Replit" badge.

Do not publish or connect a custom domain until I say so.

## Phase 7 — Applications, guardians, messaging, and privacy

### Phase 7A: Job applications go to the admin first

- A student applying to an open job creates an application with status `pending_review`. Notify the administrator by email; do not show the application to the resident yet.
- Add a Job applications queue to `/admin` showing the student's first name, age, message, job title, and private details for the administrator only.
- The administrator can approve or reject an application with a reason. An approved application becomes `applied` and the resident is notified. A rejected application notifies the student with the guardian copied.
- Business applications remain admin-first. Booking requests remain unchanged.

### Phase 7B: Group chat for each booking and job

- Add a Parent / Guardian account type to `/signup`. A guardian account can access a student only when its verified sign-in email matches the guardian email on the student's profile, case-insensitively. Guardians can sign in with Google or an email code.
- A guardian dashboard lists linked students' businesses, bookings, job applications, and chats. Business details are read-only.
- Create a chat thread when a booking is accepted and when a job is filled after guardian approval. Each thread includes the student, the student's guardian, and the resident. The administrator can read every thread.
- Add `/messages` and `/messages/:threadId`. Messages are text-only and at most 1,000 characters. Show each sender's first name and role (Student / Parent / Resident / Launch Lane); refresh messages every few seconds while open and show unread counts in the header.
- Show this notice in every thread: “Messages may be reviewed by Launch Lane to keep everyone safe. Don't share passwords or payment details.”
- Before sending a message that appears to contain a phone number, show a gentle reminder; allow the sender to continue.
- The administrator can delete a message, lock a thread, and view reported messages. Any participant can report a message, which notifies the administrator.
- Email participants with unread messages at most once per thread per hour per person. Copy the guardian on student notifications. Email only says “You have a new message on Launch Lane” with a link; never include message text.
- Enforce server-side that only thread participants and the administrator can read or post, and rate-limit message posting.

### Phase 7C: Fix remaining issues

- Change `/students` from “If you're 18 or under” to “If you're 13 to 18”. Change the student step from “Neighbors can email you about your listing” to “Neighbors can send you booking requests”.
- Update the FAQ question “How do students and neighbors communicate?” to explain that they message in a Launch Lane group chat with the student's parent or guardian, and that Launch Lane can review chats for safety. Update other text that describes the old email-only process.
- Add `/terms` and `/privacy` in the existing site design with clearly marked placeholder text for the founder to replace. Privacy text covers name, email, age, home address, guardian name and email, messages, and photos; says addresses are not public and guardians are involved for student accounts; and gives `contact@launch-laneco.com` for deletion requests.
- Link Terms and Privacy in the footer and on the sign-up page.
- Hide listing-card star ratings and “No reviews yet” until a review system exists.
- Store the administrator email log in the database, keep it administrator-only, and retain the latest 500 entries.
- Fix remaining end-to-end issues. Typecheck and build must pass; test student, resident, guardian, and administrator flows, including chat.

Do not publish or connect a domain during Phase 7.