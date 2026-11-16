import Link from "next/link";
import SubmitForm from "@/components/SubmitForm";
import Steps from "@/components/Steps";
import { categories } from "@/data/listings";
import { studentSteps } from "@/data/steps";
import { site } from "@/lib/site";

export const metadata = { title: "Students – Apply" };

export default function StudentsPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Students – Apply</p>
          <h1>Put your skills to work close to home.</h1>
          <p>
            Mow lawns, help with trash cleanup, or sell your handmade jewelry. If you&apos;re 18 or
            under and live in {site.community}, you can list your services, promote your business,
            and apply for jobs your neighbors post.
          </p>
          <div className="hero-actions">
            <a href="#apply" className="btn btn-gold">Offer a service</a>
            <Link href="/explore?type=job" className="btn btn-ghost">Browse jobs</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="section-head">
            <p className="eyebrow">Offer a service</p>
            <h2>From application to first job</h2>
            <p>Your guardian signs off before your listing goes live, and before you take any job a neighbor posts.</p>
          </div>
          <Steps steps={studentSteps} accent="gold" />
        </div>
      </section>

      <section className="section bg-cream" id="apply">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Apply</p>
            <h2>Tell us what you offer</h2>
          </div>
          <div className="form-wrap">
            <div className="form-card">
              <SubmitForm
                kind="student-application"
                submitLabel="Submit application"
                successTitle="Application received"
                successBody="Thanks! We'll review your application, then email your guardian to review and sign. Your listing goes live once they approve."
              >
                <fieldset className="fieldset">
                  <legend>Your service</legend>
                  <div className="field">
                    <label htmlFor="business">Business or listing name</label>
                    <input className="input" id="business" name="business" required placeholder="e.g. Trash & Recycling Bin Cleanup" />
                  </div>
                  <div className="field">
                    <label htmlFor="category">Category</label>
                    <select className="select" id="category" name="category" required defaultValue="">
                      <option value="" disabled>Choose one</option>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="description">What you offer</label>
                    <textarea className="textarea" id="description" name="description" required
                      placeholder="What's included, when you're available, and any experience that relates to it." />
                  </div>
                </fieldset>

                <fieldset className="fieldset">
                  <legend>About you</legend>
                  <div className="row-2">
                    <div className="field">
                      <label htmlFor="name">Your name</label>
                      <input className="input" id="name" name="name" required autoComplete="name" />
                    </div>
                    <div className="field">
                      <label htmlFor="age">Age</label>
                      <input className="input" id="age" name="age" type="number" min="10" max="18" required />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email for your listing</label>
                    <input className="input" id="email" name="email" type="email" required autoComplete="email" />
                    <span className="hint">Shown on your listing. Your phone number is never shown.</span>
                  </div>
                  <div className="field">
                    <label htmlFor="address">Home address</label>
                    <input className="input" id="address" name="address" required autoComplete="street-address" />
                    <span className="hint">Used only to check that you live in {site.community}. Never shown publicly.</span>
                  </div>
                </fieldset>

                <fieldset className="fieldset">
                  <legend>Guardian</legend>
                  <div className="row-2">
                    <div className="field">
                      <label htmlFor="gname">Guardian name</label>
                      <input className="input" id="gname" name="guardianName" required />
                    </div>
                    <div className="field">
                      <label htmlFor="gemail">Guardian email</label>
                      <input className="input" id="gemail" name="guardianEmail" type="email" required />
                    </div>
                  </div>
                  <label className="check">
                    <input type="checkbox" name="agree" required />
                    <span>I understand my guardian must approve my listing and any job I take, and will receive a copy of every email sent to me through {site.name}.</span>
                  </label>
                </fieldset>
              </SubmitForm>
            </div>

            <aside className="aside">
              <h3>Before you start a job</h3>
              <ul className="check-list">
                <li>Agree on the work and payment details</li>
                <li>Discuss safety</li>
                <li>Check any insurance requirements</li>
              </ul>
              <p className="note">You keep 100% of what you earn. <Link href="/how-it-works#before-you-agree">Read more</Link></p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
