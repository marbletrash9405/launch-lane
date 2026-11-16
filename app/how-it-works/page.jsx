import Link from "next/link";
import Steps from "@/components/Steps";
import { studentSteps, hirerSteps } from "@/data/steps";
import { site } from "@/lib/site";

export const metadata = { title: "How it works" };

const terms = [
  {
    t: "Safety and privacy",
    b: `A guardian reviews and signs off on every student listing before it goes live. Guardians receive a copy of every email sent to their student through ${site.name} and can request removal of the listing at any time. Student phone numbers and home addresses stay off public listings. We check whether the address provided falls within ${site.community}.`,
  },
  {
    t: "Insurance",
    b: `${site.name} does not provide insurance coverage for students, neighbors, or any work they arrange through ${site.name}. Before work begins, students and neighbors should discuss any insurance requirements and confirm what coverage applies.`,
  },
  {
    t: "Payment",
    b: "Students and neighbors agree directly on the price, schedule, and how and when payment will be made. Neighbors pay students directly, and students keep 100% of what they earn.",
  },
  {
    t: "Scope of work and liability",
    b: `${site.name} helps students and neighbors connect. The student and neighbor agree directly on the scope of work, price, schedule, and safety expectations. They are responsible for carrying out their agreement and addressing any disputes.`,
  },
];

export default function HowItWorks() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">How it works</p>
          <h1>Simple for neighbors. Safe for students.</h1>
          <p>What happens on each side of a {site.name} job, and what to settle before any work starts.</p>
          <div className="hero-actions">
            <a href="#neighbors" className="btn btn-gold">For neighbors</a>
            <a href="#students" className="btn btn-ghost">For students</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid-2 how-cols">
          <div id="neighbors">
            <p className="eyebrow">For neighbors</p>
            <h2 className="col-title">Find it close to home</h2>
            <Steps steps={hirerSteps} />
            <div className="hero-actions">
              <Link href="/residents#post-a-job" className="btn btn-teal">Post a job</Link>
            </div>
          </div>
          <div id="students">
            <p className="eyebrow">For students</p>
            <h2 className="col-title">Put your skills to work close to home</h2>
            <Steps steps={studentSteps} accent="gold" />
            <div className="hero-actions">
              <Link href="/students#apply" className="btn btn-gold">Offer a service</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-cream" id="before-you-agree">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Read this first</p>
            <h2>Before you agree to a job</h2>
          </div>
          <div className="grid-2">
            {terms.map((x) => (
              <div className="feature" key={x.t} style={{ background: "var(--white)" }}>
                <h3>{x.t}</h3>
                <p style={{ marginTop: 8 }}>{x.b}</p>
              </div>
            ))}
          </div>
          <p className="disclaimer">
            To the extent permitted by applicable law, neither {site.name} nor any of its founding
            members can be held accountable or liable for the work agreed to between a student and
            a neighbor, how it is performed, or any resulting injury, property damage, payment
            dispute, or other loss.
          </p>
          <p style={{ marginTop: 28 }}>
            More questions? See the <Link href="/faq" className="inline-link">FAQ</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
