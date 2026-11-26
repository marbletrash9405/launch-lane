import { Link } from "wouter";

const UPDATED = "November 26, 2026";

export default function TermsPage() {
  return (
    <section className="legal-page">
      <div className="phase-wrap">
        <p className="eyebrow">Launch Lane / Policies</p>
        <h1>Terms of Use</h1>
        <p className="legal-lead">The rules for using Launch Lane, the neighborhood board that connects Mercer Crossing students with neighbors who need a hand.</p>
        <p className="legal-updated">Last updated {UPDATED}</p>
        <div className="legal-content">
          <h2>1. What Launch Lane is</h2>
          <p>Launch Lane is a free, non-profit community website for the Mercer Crossing neighborhood in Farmers Branch, Texas. Students can list services they offer, residents can book those services or post jobs, and students can apply for jobs and for openings at other students&apos; businesses. Launch Lane does not process payments, does not take a cut, and is not an employer, staffing agency, or party to any arrangement made through the site.</p>

          <h2>2. Who can use it</h2>
          <p><strong>Students</strong> must be ages 13 to 18 and live in Mercer Crossing. Every student account lists a parent or guardian, who approves each business listing and each job or opening before the student takes it, and who is copied on emails and included in work conversations.</p>
          <p><strong>Residents</strong> must be adults (18 or older) who live in Mercer Crossing. <strong>Guardians</strong> may create an account to follow their student&apos;s activity.</p>
          <p>You must give accurate information, keep your sign-in secure, and use only your own account. People under 13 may not use Launch Lane.</p>

          <h2>3. How listings and jobs are reviewed</h2>
          <p>Launch Lane reviews every business listing, job post, opening, and application before it goes to anyone else, and reviews new photos or logos for approved businesses before they replace the current ones. We may approve, decline, edit for clarity, pause, or remove any listing, post, application, or message, and may suspend accounts, at our discretion, especially to keep students safe.</p>

          <h2>4. Your agreements are between you</h2>
          <p>Students, their guardians, and neighbors agree directly on the work, schedule, price or pay, and safety expectations before any work begins. Payment happens directly between you, outside the site. You are responsible for deciding whether a job is appropriate and safe, for following applicable laws (including any rules about work hours and types of work for minors), and for any taxes, permits, or insurance that apply to you.</p>

          <h2>5. Safety rules</h2>
          <p>Meet and work in safe, visible settings, and keep guardians informed. Keep in-app conversations respectful and about the work. Do not share passwords or payment card details in chat, and do not ask a student to keep anything from their guardian. You may not post anything false, unsafe, illegal, discriminatory, harassing, sexual, or violent, and you may not use Launch Lane to advertise unrelated products, collect people&apos;s information, or contact students outside the purpose of a listing or job. Report any concern to <a href="mailto:contact@launch-laneco.com">contact@launch-laneco.com</a>, or use the report button in a conversation. If someone is in danger, call 911.</p>

          <h2>6. What you post</h2>
          <p>You keep ownership of the text, photos, and logos you submit. You give Launch Lane permission to display them on the site and in related emails so your listing, post, or application can work. Only upload photos and logos you made or have the right to use, and don&apos;t upload photos of other people without their permission.</p>

          <h2>7. No guarantees</h2>
          <p>Launch Lane is provided &ldquo;as is.&rdquo; We review content to help keep the community safe, but we do not run background checks and cannot guarantee the quality, safety, or legality of any service, job, or person, or that the site will always be available. To the fullest extent the law allows, Launch Lane and its volunteers are not liable for any loss, injury, or damage that comes from using the site or from arrangements made through it.</p>

          <h2>8. Ending your account</h2>
          <p>You can stop using Launch Lane at any time and ask us to delete your account by emailing <a href="mailto:contact@launch-laneco.com">contact@launch-laneco.com</a>. We may suspend or close accounts that break these terms.</p>

          <h2>9. Changes</h2>
          <p>We may update these terms as Launch Lane grows. We&apos;ll change the date at the top, and important changes will be shown on the site. Continuing to use Launch Lane after an update means you accept the new terms.</p>

          <h2>10. Contact</h2>
          <p>These terms are governed by the laws of Texas. Questions? Email <a href="mailto:contact@launch-laneco.com">contact@launch-laneco.com</a>. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
      </div>
    </section>
  );
}
