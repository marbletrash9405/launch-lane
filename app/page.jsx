import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { listings } from "@/data/listings";
import { site } from "@/lib/site";
import {
  IconRing, SearchIcon, PeopleIcon, ShieldXIcon,
  ShieldCheckIcon, GuardianIcon, MailIcon,
} from "@/components/Icons";

const steps = [
  { title: "Apply", body: "Students submit business details, services offered, their home address and guardian information." },
  { title: "Review and approve", body: "After the address check, a guardian signs the application before the listing goes live." },
  { title: "Connect", body: "Residents browse services or post requests. Students and residents connect by email." },
  { title: "Arrange", body: "The student and resident agree on the work, price, schedule and payment method." },
];

export default function Home() {
  const preview = [
    listings.find((l) => l.type === "offering"),
    listings.find((l) => l.type === "request"),
    listings.filter((l) => l.type === "offering")[1],
  ].filter(Boolean);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>{site.name}</h1>
            <p className="hero-sub">for {site.community}</p>
            <div className="hero-rule" />
            <p className="hero-tag">{site.tagline}</p>
            <div className="hero-actions">
              <Link href="/listings" className="btn btn-gold">Browse services</Link>
              <Link href="/apply" className="btn btn-ghost">Offer a service</Link>
            </div>
          </div>
          <div className="hero-card">
            <p><b>Students offer:</b> Services for residents to browse.</p>
            <p><b>Residents request:</b> Help that students can apply for.</p>
            <p><b>Students:</b> 18 &amp; under, residing in {site.community}.</p>
          </div>
        </div>
      </section>

      {/* Problem + story */}
      <section className="section">
        <div className="wrap split">
          <div>
            <div className="section-head">
              <p className="eyebrow">Why it exists</p>
              <h2>Neighbors and student businesses keep missing each other</h2>
            </div>
            <div className="points">
              <div className="point">
                <IconRing><SearchIcon /></IconRing>
                <div>
                  <h3>Students struggle to reach customers</h3>
                  <p>Students offering trash cleanup, babysitting, lawn care and henna lack a single, safe place to reach people in the neighborhood.</p>
                </div>
              </div>
              <div className="point">
                <IconRing><PeopleIcon /></IconRing>
                <div>
                  <h3>Residents look outside the community</h3>
                  <p>People who need occasional help with babysitting, moving or hauling often don&apos;t know whom to ask nearby.</p>
                </div>
              </div>
              <div className="point">
                <IconRing><ShieldXIcon /></IconRing>
                <div>
                  <h3>Door-to-door outreach falls short</h3>
                  <p>Knocking on doors is unsafe and impractical in a community this large. No-solicitation signs and busy schedules make it hard to reach everyone.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="story">
            <h3>A summer business revealed the gap</h3>
            <p>I started a trash cleaning business to gain experience and earn money. Finding customers meant knocking on doors, and my friends faced the same challenge.</p>
            <p>{site.name} gives students and residents one place to find each other.</p>
            <p style={{ marginTop: 22 }}>
              <Link href="/about" className="btn btn-outline btn-sm">Read our story</Link>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section bg-cream" id="how-it-works">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Four steps from idea to first job</h2>
          </div>
          <ol className="steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {steps.map((s, i) => (
              <li className="step" key={s.title}>
                <div className="step-num">{i + 1}</div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="callout">
            Payments stay between the student and resident. {site.name} takes no share. Both parties
            confirm insurance and other requirements before work begins. Terms and conditions apply.
          </p>
        </div>
      </section>

      {/* Listings preview */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">On the board</p>
            <h2>Offer what you do. Ask for what you need.</h2>
            <p>Students list services residents can browse. Residents post requests students can respond to.</p>
          </div>
          <div className="grid-3">
            {preview.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
          <p style={{ marginTop: 28 }}>
            <Link href="/listings" className="btn btn-teal">See all listings</Link>
          </p>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="section bg-cream" id="safety">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Trust &amp; safety</p>
            <h2>Built with guardians in the loop</h2>
            <p>Community eligibility, guardian approval and email-only contact before any student begins work.</p>
          </div>
          <div className="grid-3">
            <div className="feature" style={{ background: "var(--white)" }}>
              <IconRing><ShieldCheckIcon /></IconRing>
              <h3>Community eligibility</h3>
              <p>Students 18 &amp; under living in {site.community} can apply. Residents must also live within the HOA community.</p>
            </div>
            <div className="feature" style={{ background: "var(--white)" }}>
              <IconRing><GuardianIcon /></IconRing>
              <h3>Guardian approval</h3>
              <p>A guardian approves and signs the student&apos;s application before the listing goes live.</p>
            </div>
            <div className="feature" style={{ background: "var(--white)" }}>
              <IconRing><MailIcon /></IconRing>
              <h3>Email contact</h3>
              <p>Listings show an email address, never a phone number. Guardians receive a copy of every email.</p>
            </div>
          </div>
          <p className="callout">
            Address review: the address check confirms whether an address lies within {site.community}.
            It does not establish residency or replace background checks. Work arrangements, payments,
            and legal and insurance matters remain between the student and resident.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Ready to get started?</h2>
              <p>List a service in a few minutes, or tell students what you need help with.</p>
            </div>
            <div className="hero-actions">
              <Link href="/apply" className="btn btn-gold">Offer a service</Link>
              <Link href="/request" className="btn btn-ghost">Post a request</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
