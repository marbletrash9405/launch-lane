import { Link } from "wouter";

const UPDATED = "November 26, 2026";

export default function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="phase-wrap">
        <p className="eyebrow">Launch Lane / Policies</p>
        <h1>Privacy Policy</h1>
        <p className="legal-lead">Your private details stay private. Here is exactly what Launch Lane collects, who can see it, and how to have it deleted.</p>
        <p className="legal-updated">Last updated {UPDATED}</p>
        <div className="legal-content">
          <h2>What we collect</h2>
          <p><strong>Everyone:</strong> your name, email address, and account type. If you sign in with Google, we receive your name and verified email from Google; we never see your Google password.</p>
          <p><strong>Students:</strong> age, home address, and your parent or guardian&apos;s name and email. <strong>Residents:</strong> home address.</p>
          <p><strong>What you submit:</strong> business listings (name, category, description, pricing, photos, logo), booking requests, job posts and openings, job applications (your message, whether you have another job, and your availability), and messages in Launch Lane conversations.</p>
          <p><strong>Technical:</strong> basic request logs (such as time, page, and IP address) used to run the site, prevent abuse, and fix problems. We don&apos;t use advertising trackers.</p>

          <h2>Who can see what</h2>
          <p><strong>The public</strong> sees approved business listings (business name, category, description, pricing, photos, logo, and the student&apos;s first name) and approved job posts with the resident&apos;s street name only, never a house number.</p>
          <p><strong>Neighbors and business owners</strong> see an applicant&apos;s first name, age, message, availability, and whether they have another job, only after Launch Lane approves the application. Email addresses are exchanged only once a booking is accepted or a guardian approves a job, so you can coordinate.</p>
          <p><strong>Guardians</strong> see their student&apos;s listings, bookings, applications, and work conversations.</p>
          <p><strong>Launch Lane&apos;s administrator</strong> sees account and submission details, including private addresses, to review listings, keep students safe, and handle reports. Conversations can be reviewed for safety.</p>
          <p>Home addresses are never shown publicly.</p>

          <h2>How we use it</h2>
          <p>To run Launch Lane: confirm people live in Mercer Crossing, review submissions, involve guardians, connect students with neighbors, send account and safety emails, and prevent misuse. We do not sell or rent personal information, and we don&apos;t use it for advertising.</p>

          <h2>Services we rely on</h2>
          <p>Launch Lane uses a few service providers to operate, and they handle data only to provide their service to us: Clerk (sign-in), Vercel (website hosting and photo storage), Neon (database), Resend (email delivery), and Google (if you choose Google sign-in).</p>

          <h2>Students and children</h2>
          <p>Launch Lane is for students ages 13 to 18 and adults. We don&apos;t knowingly collect information from anyone under 13; if we learn we have, we delete it. Parents or guardians can ask to see or delete their student&apos;s information at any time.</p>

          <h2>How long we keep it</h2>
          <p>We keep account information while your account is open. Conversations are kept for safety unless deletion is requested. Our record of sent emails keeps only the most recent 500. When you ask us to delete your account, we delete your personal information except what we must keep to handle a safety report or meet a legal requirement.</p>

          <h2>Your choices</h2>
          <p>You can update your profile and listings from your dashboard. To get a copy of your information, correct it, or delete your account, email <a href="mailto:contact@launch-laneco.com">contact@launch-laneco.com</a> from the email on your account (or, for a student, from the guardian&apos;s email on file).</p>

          <h2>Security</h2>
          <p>Sign-in is handled by Clerk, guardian approval links are single-use and expire after seven days, photos stay private until a listing is approved, and access to private details is limited to the people described above. No system is perfectly secure, so please let us know right away if you notice anything wrong.</p>

          <h2>Changes and contact</h2>
          <p>We&apos;ll update the date above when this policy changes. Questions? Email <a href="mailto:contact@launch-laneco.com">contact@launch-laneco.com</a>. For the rules of using the site, see our <Link href="/terms">Terms of Use</Link>.</p>
        </div>
      </div>
    </section>
  );
}
