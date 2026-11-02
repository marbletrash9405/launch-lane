import DemoForm from "@/components/DemoForm";
import { categories } from "@/data/listings";
import { site } from "@/lib/site";

export const metadata = { title: "Post a request" };

export default function RequestPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">For residents</p>
          <h1>Post a request</h1>
          <p>Need a hand with the yard, a move or an evening of babysitting? Describe it and local students can reach out.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap form-wrap">
          <DemoForm
            submitLabel="Post request"
            submitClass="btn-blue"
            successTitle="Request submitted"
            successBody="Once your address is confirmed, your request appears on the board and students can email you."
          >
            <fieldset className="fieldset">
              <legend>What you need</legend>
              <div className="field">
                <label htmlFor="title">Title</label>
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
                <label htmlFor="details">Details</label>
                <textarea className="textarea" id="details" name="details" required
                  placeholder="Size of the job, how often, timing, and whether you'll pay per visit." />
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
                <span className="hint">Used to confirm you live in {site.community}. Only your street name appears on the listing.</span>
              </div>
              <label className="check">
                <input type="checkbox" name="agree" required />
                <span>I understand the work, price, schedule, payment and any insurance are arranged directly between me and the student.</span>
              </label>
            </fieldset>
          </DemoForm>

          <aside className="aside">
            <h3>Good to know</h3>
            <ol>
              <li>Requests are open to {site.community} residents only.</li>
              <li>Students reply by email. A guardian is copied on every message.</li>
              <li>Agree on the work, price, schedule and payment before starting.</li>
            </ol>
            <p className="note">Payments go directly to the student. {site.name} takes no share.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
