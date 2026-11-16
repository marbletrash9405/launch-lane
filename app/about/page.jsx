import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = { title: "About us" };

// TODO: Replace the bracketed placeholders below with real content.
// Photos: add images to /public (e.g. /public/team/founder.jpg) and swap
// the <div className="placeholder"> blocks for <img src="/team/founder.jpg" alt="..." />.
const team = [
  { name: "[Founder Name]", role: "Founder", bio: "[One or two sentences about you: grade, school, what you run, why you started Launch Lane.]" },
  { name: "[Team Member]", role: "[Role, e.g. Outreach]", bio: "[Short bio placeholder.]" },
  { name: "[Team Member]", role: "[Role, e.g. Safety & Reviews]", bio: "[Short bio placeholder.]" },
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

      {/* Mission */}
      <section className="section">
        <div className="wrap">
          <div className="mission">
            <p className="eyebrow">Our mission</p>
            <p className="mission-text">
              Our mission is to give {site.community} students a safer way to find customers and
              earn money close to home.
            </p>
            <p className="mission-sub">
              Students can offer a service, grow a small business, or find work that fits around
              school. Neighbors can find help with everyday tasks like babysitting or moving boxes
              while supporting young people in their own community.
            </p>
          </div>
        </div>
      </section>

      {/* How it started */}
      <section className="section bg-cream">
        <div className="wrap split">
          <div>
            <div className="section-head" style={{ marginBottom: 20 }}>
              <p className="eyebrow">How it started</p>
              <h2>A summer business revealed the gap</h2>
            </div>
            <div className="prose">
              <p>
                One summer, I started a trash bin cleaning business to earn my own money and learn
                how to run a business. Cleaning the bins was the easy part. Finding customers meant
                knocking on doors, one house at a time. Between safety concerns, no-soliciting
                signs, and neighbors often being out, there were only so many people I could reach
                in a day.
              </p>
              <p>
                My friends who cleaned windows, mowed lawns, or did nail art ran into the same
                problem. At the same time, neighbors who needed an extra hand often looked outside
                {" "}{site.community} because they didn&apos;t know who nearby could help. I started{" "}
                {site.name} to give students and neighbors one place to find each other.
              </p>
            </div>
          </div>
          <div className="placeholder" style={{ minHeight: 320 }}>
            [Photo placeholder]<br />e.g. you with your bin-cleaning setup
          </div>
        </div>
      </section>

      {/* Ethos */}
      <section className="section">
        <div className="wrap">
          <div className="quote-band">
            <span className="ethos-label">Ethos</span>
            <p>
              We believe students should have a safe way to try out a business idea, work with
              friends, and earn money in their own neighborhood.
            </p>
            <p className="ethos-sub">
              {site.name} is built on trust between students, families, and neighbors. Students put
              in the time and effort to do the work, so they should keep every dollar they earn.
              That&apos;s why {site.name} takes no cut.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section" style={{ paddingTop: 0 }}>
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
            {["Student listings", "Jobs posted", "Jobs completed"].map((label) => (
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
              <Link href="/students" className="btn btn-ghost">For students</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
