import Link from "next/link";
import SubmitForm from "@/components/SubmitForm";
import Steps from "@/components/Steps";
import { categories } from "@/data/listings";
import { hirerSteps } from "@/data/steps";
import { site } from "@/lib/site";

export const metadata = { title: "Residents – Post a job" };

export default function ResidentsPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Residents – Post a job</p>
          <h1>Find it close to home</h1>
          <p>
            From lawn mowing and trash cleanup to social media help, discover what {site.community}{" "}
            students offer. Browse student services or post a job and let interested students apply.
          </p>
          <div className="hero-actions">
            <Link href="/explore" className="btn btn-gold">Browse student services</Link>
            <a href="#post-a-job" className="btn btn-ghost">Post a job</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="notice">
            You must live in {site.community} in {site.location}, to post a job or hire a student
            through {site.name}.
          </p>
        </div>
        <div className="wrap split" style={{ marginTop: 48 }}>
          <div className="section-head">
            <p className="eyebrow">How hiring works</p>
            <h2>Four steps to getting it done</h2>
          </div>
          <Steps steps={hirerSteps} />
        </div>
      </section>

      <section className="section bg-cream" id="post-a-job">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Post a job</p>
            <h2>Tell students what you need</h2>
          </div>
          <div className="form-wrap">
            <div className="form-card">
              <SubmitForm
                kind="job-post"
                submitLabel="Post job"
                submitClass="btn-blue"
                successTitle="Job submitted"
                successBody={`Thanks! We'll review it and confirm your address is in ${site.community}. Once approved, your job appears on Explore Services and students can apply.`}
              >
                <fieldset className="fieldset">
                  <legend>The job</legend>
                  <div className="field">
                    <label htmlFor="title">Job title</label>
                    <input className="input" id="title" name="title" required placeholder="e.g. Weekly Lawn Mowing" />
                  </div>
                  <div className="field">
                    <label htmlFor="category">Category</label>
                    <select className="select" id="category" name="category" required defaultValue="">
                      <option value="" disabled>Choose one</option>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="details">Short description</label>
                    <textarea className="textarea" id="details" name="details" required
                      placeholder="What needs doing, and roughly how big the job is." />
                  </div>
                  <div className="row-2">
                    <div className="field">
                      <label htmlFor="timing">Preferred timing</label>
                      <input className="input" id="timing" name="timing" required placeholder="e.g. Saturday mornings" />
                    </div>
                    <div className="field">
                      <label htmlFor="pay">What you&apos;re offering to pay</label>
                      <input className="input" id="pay" name="pay" required placeholder="e.g. $25 per visit" />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="fieldset">
                  <legend>Your contact</legend>
                  <div className="row-2">
                    <div className="field">
                      <label htmlFor="name">Name</label>
                      <input className="input" id="name" name="name" required autoComplete="name" />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input className="input" id="email" name="email" type="email" required autoComplete="email" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="address">Home address</label>
                    <input className="input" id="address" name="address" required autoComplete="street-address" />
                    <span className="hint">Used to check that you live in {site.community}. Only your street name appears on the job.</span>
                  </div>
                  <label className="check">
                    <input type="checkbox" name="agree" required />
                    <span>I understand the scope, schedule, price, payment, safety and any insurance are agreed directly between me and the student.</span>
                  </label>
                </fieldset>
              </SubmitForm>
            </div>

            <aside className="aside">
              <h3>Good to know</h3>
              <ul className="check-list">
                <li>Every application comes to us first, then we connect you with the student.</li>
                <li>A guardian signs off before a student accepts your job.</li>
                <li>You pay the student directly. {site.name} takes no cut.</li>
              </ul>
              <p className="note"><Link href="/how-it-works#before-you-agree">Before you agree to a job</Link></p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
