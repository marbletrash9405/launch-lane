import Link from "next/link";
import Faq from "@/components/Faq";
import { site } from "@/lib/site";

export const metadata = { title: "How it works" };

const neighborSteps = [
  { t: "Browse or post", b: "Look through services students are offering, or post a request describing what you need, like a weekly mow or help moving boxes." },
  { t: "Reach out by email", b: "Tap Email on any listing. Students who see your request can email you too." },
  { t: "Agree on the details", b: "Settle the work, price, schedule and payment method together before anything starts." },
  { t: "Get it done and pay directly", b: "Pay the student however you agreed. Launch Lane never touches the money." },
];

const studentSteps = [
  { t: "Apply", b: "Describe your service, add your contact email and home address, and enter a parent or guardian's details." },
  { t: "Address check", b: `We confirm your address is inside ${site.community}. It's never shown on your listing.` },
  { t: "Guardian approval", b: "Your guardian gets an email to review and sign. Once they do, your listing goes live." },
  { t: "Start earning", b: "Neighbors email you, you agree on the job, and you keep 100% of what you're paid." },
];

function Steps({ steps, accent }) {
  return (
    <ol className="v-steps">
      {steps.map((s, i) => (
        <li key={s.t}>
          <span className={`v-num ${accent}`}>{i + 1}</span>
          <div>
            <h3>{s.t}</h3>
            <p>{s.b}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">How it works</p>
          <h1>Simple for neighbors. Safe for students.</h1>
          <p>Here&apos;s what happens on each side of a {site.name} job, and what we do (and don&apos;t do) to keep it safe.</p>
          <div className="hero-actions">
            <a href="#neighbors" className="btn btn-gold">For neighbors</a>
            <a href="#students" className="btn btn-ghost">For students</a>
          </div>
        </div>
      </section>

      <section className="section" id="neighbors">
        <div className="wrap split">
          <div className="section-head">
            <p className="eyebrow">For neighbors</p>
            <h2>Find help a few doors down</h2>
            <p>Anyone living in {site.community} can browse listings and post requests.</p>
            <div className="hero-actions">
              <Link href="/listings" className="btn btn-teal">Browse services</Link>
              <Link href="/request" className="btn btn-outline">Post a request</Link>
            </div>
          </div>
          <Steps steps={neighborSteps} accent="" />
        </div>
      </section>

      <section className="section bg-cream" id="students">
        <div className="wrap split">
          <div className="section-head">
            <p className="eyebrow">For students</p>
            <h2>Your first customers live on your street</h2>
            <p>Students 18 and under who live in {site.community} can list a service for free.</p>
            <div className="hero-actions">
              <Link href="/apply" className="btn btn-gold">Offer a service</Link>
            </div>
          </div>
          <Steps steps={studentSteps} accent="gold" />
        </div>
      </section>

      <section className="section" id="guardians">
        <div className="wrap">
          <div className="guardian-band">
            <div>
              <p className="eyebrow">For parents &amp; guardians</p>
              <h2>You stay in the loop the whole time</h2>
            </div>
            <ul className="check-list">
              <li>You approve and sign your student&apos;s listing before anyone can see it.</li>
              <li>You get a copy of every email sent to your student through {site.name}.</li>
              <li>Your student&apos;s phone number and home address are never shown publicly.</li>
              <li>You can ask us to take a listing down at any time.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-cream" id="safety">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Safety</p>
            <h2>What we check, and what we don&apos;t</h2>
            <p>We&apos;d rather be upfront than overpromise.</p>
          </div>
          <div className="grid-2">
            <div className="feature" style={{ background: "var(--white)" }}>
              <h3 style={{ color: "var(--teal)" }}>We do</h3>
              <ul className="check-list">
                <li>Confirm addresses fall inside {site.community}</li>
                <li>Require guardian approval for every student listing</li>
                <li>Keep phone numbers and full addresses off listings</li>
                <li>Copy guardians on student emails</li>
              </ul>
            </div>
            <div className="feature" style={{ background: "var(--white)" }}>
              <h3 style={{ color: "var(--brown)" }}>We don&apos;t</h3>
              <ul className="x-list">
                <li>Run background checks or prove residency</li>
                <li>Handle payments or take a cut</li>
                <li>Provide insurance or guarantee any work</li>
                <li>Set prices or schedules for anyone</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="wrap faq-wrap">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions</h2>
            <p>Something not covered? <a href={`mailto:${site.contactEmail}`}>Email us</a>.</p>
          </div>
          <Faq />
        </div>
      </section>
    </>
  );
}
