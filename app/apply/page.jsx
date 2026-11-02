import DemoForm from "@/components/DemoForm";
import { categories } from "@/data/listings";
import { site } from "@/lib/site";

export const metadata = { title: "Offer a service" };

export default function ApplyPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">For students</p>
          <h1>Offer a service</h1>
          <p>Tell neighbors what you do. Your listing goes live once your address is checked and a guardian signs off.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap form-wrap">
          <DemoForm
            submitLabel="Submit application"
            successTitle="Application received"
            successBody="We'll check your address and email your guardian to review and sign. Your listing goes live after that."
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
                  placeholder="What's included, when you're available, and how residents should reach out about pricing." />
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
                <span className="hint">Used only to confirm you live in {site.community}. Never shown publicly.</span>
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
                <span>I understand my guardian must approve this application and will receive a copy of every email sent through my listing.</span>
              </label>
            </fieldset>
          </DemoForm>

          <aside className="aside">
            <h3>What happens next</h3>
            <ol>
              <li>We check that your address is in {site.community}.</li>
              <li>Your guardian gets an email to review and sign.</li>
              <li>Your listing goes live on the board.</li>
              <li>Residents email you, and you agree on the details together.</li>
            </ol>
            <p className="note">{site.name} takes no share of what you earn.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
