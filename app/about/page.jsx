import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = { title: "About us" };

// TODO: Replace every highlighted placeholder below with real content.
// Photos: add images to /public (e.g. /public/team/founder.jpg) and swap
// the <div className="placeholder"> blocks for <img src="/team/founder.jpg" alt="..." />.
const team = [
  { name: "[Founder Name]", role: "Founder", bio: "[One or two sentences about you: grade, school, what you run, why you started Launch Lane.]" },
  { name: "[Team Member]", role: "[Role, e.g. Outreach]", bio: "[Short bio placeholder.]" },
  { name: "[Team Member]", role: "[Role, e.g. Safety & Reviews]", bio: "[Short bio placeholder.]" },
];

const values = [
  { title: "Safety first", body: "Guardian approval, community-only access and email contact come before everything else." },
  { title: "Students keep what they earn", body: `${site.name} takes no share. Payments stay between the student and resident.` },
  { title: "Neighbors helping neighbors", body: `Keep work, money and trust inside ${site.community}.` },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">About us</p>
          <h1>Built by a student, for the neighborhood</h1>
          <p>{site.tagline}</p>
        </div>
      </section>

      {/* Story */}
      <section className="section">
        <div className="wrap split">
          <div>
            <div className="section-head" style={{ marginBottom: 20 }}>
              <p className="eyebrow">Our story</p>
              <h2>A summer business revealed the gap</h2>
            </div>
            <div style={{ display: "grid", gap: 16, color: "var(--muted)", fontSize: "1.05rem" }}>
              <p>
                I started a trash cleaning business to gain experience and earn money. Finding
                customers meant knocking on doors. My friends faced the same challenge.
              </p>
              <p>
                {site.name} gives students and residents one place to find each other.
              </p>
              <p>
                <span className="todo">[Placeholder: add a line about when Launch Lane launched, who helped, or a milestone, e.g. “Launched in [Month Year] with support from the {site.community} HOA.”]</span>
              </p>
            </div>
          </div>
          <div className="placeholder" style={{ minHeight: 320 }}>
            [Photo placeholder]<br />e.g. you with your bin-cleaning setup
          </div>
        </div>
      </section>

      {/* Mission + values */}
      <section className="section bg-cream">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Our mission</p>
            <h2>Make it easy and safe for students to earn close to home</h2>
            <p><span className="todo">[Placeholder: one-sentence mission statement in your own words.]</span></p>
          </div>
          <div className="values">
            {values.map((v) => (
              <div className="feature" key={v.title} style={{ background: "var(--white)" }}>
                <h3>{v.title}</h3>
                <p style={{ marginTop: 8 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">The team</p>
            <h2>Who&apos;s behind {site.name}</h2>
          </div>
          <div className="grid-3">
            {team.map((m, i) => (
              <div className="team-card" key={i}>
                <div className="placeholder">[Photo]</div>
                <h3>{m.name}</h3>
                <p className="role">{m.role}</p>
                <p className="bio">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers placeholder */}
      <section className="section bg-cream">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">So far</p>
            <h2>By the numbers</h2>
          </div>
          <div className="grid-3">
            {["Student listings", "Resident requests", "Jobs completed"].map((label) => (
              <div className="feature" key={label} style={{ background: "var(--white)" }}>
                <p style={{ fontFamily: "var(--display)", fontSize: "2.6rem", color: "var(--teal)" }}>[#]</p>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Questions or ideas?</h2>
              <p>We&apos;d love to hear from students, guardians and neighbors.</p>
            </div>
            <div className="hero-actions">
              <a href={`mailto:${site.contactEmail}`} className="btn btn-gold">Email us</a>
              <Link href="/apply" className="btn btn-ghost">Offer a service</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
