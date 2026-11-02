import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import CategoryIcon from "@/components/CategoryIcon";
import Faq from "@/components/Faq";
import { listings, categories } from "@/data/listings";
import { site } from "@/lib/site";
import { IconRing, ShieldCheckIcon, GuardianIcon, MailIcon, ArrowIcon } from "@/components/Icons";

export default function Home() {
  // Newest first: put the most recent listings at the top of data/listings.js.
  const latest = listings.slice(0, 3);
  const recent = listings.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>{site.name}</h1>
            <p className="hero-sub">for {site.community}</p>
            <div className="hero-rule" />
            <p className="hero-tag">
              The neighborhood board where local students offer their services and neighbors
              find a hand: yard work, babysitting, bin cleaning, moving help and more.
            </p>
            <div className="hero-actions">
              <Link href="/listings" className="btn btn-gold">I need a hand</Link>
              <Link href="/apply" className="btn btn-ghost">I want to offer a service</Link>
            </div>
          </div>

          <div className="board-preview" aria-label="Recently posted">
            <p className="board-label">Recently posted</p>
            {latest.map((l) => (
              <Link href="/listings" key={l.id} className="board-row">
                <span className="board-icon"><CategoryIcon name={l.category} /></span>
                <span className="board-text">
                  <strong>{l.title}</strong>
                  <small>{l.type === "offering" ? "Student offering" : "Neighbor looking for help"}</small>
                </span>
                <span className={`pill ${l.type === "offering" ? "pill-offer" : "pill-request"}`}>
                  {l.type === "offering" ? "Offering" : "Request"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Browse by category</p>
            <h2>What can students help with?</h2>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c} href={`/listings?category=${encodeURIComponent(c)}`} className="cat-tile">
                <span className="cat-icon"><CategoryIcon name={c} /></span>
                <span>{c}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Two ways to use it */}
      <section className="section bg-cream">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Two ways to use {site.name}</h2>
          </div>
          <div className="grid-2">
            <div className="path-card">
              <p className="path-for">For neighbors</p>
              <h3>Get help without leaving the neighborhood</h3>
              <ol className="mini-steps">
                <li><b>Browse</b> services students are offering, or post what you need.</li>
                <li><b>Email</b> the student right from their listing.</li>
                <li><b>Agree</b> on the work, price and timing, then pay them directly.</li>
              </ol>
              <div className="hero-actions">
                <Link href="/listings" className="btn btn-teal">Browse services</Link>
                <Link href="/request" className="btn btn-outline">Post a request</Link>
              </div>
            </div>
            <div className="path-card path-student">
              <p className="path-for">For students</p>
              <h3>Turn what you&apos;re good at into a real business</h3>
              <ol className="mini-steps">
                <li><b>List</b> your service in a few minutes.</li>
                <li><b>Get approved</b> by a parent or guardian.</li>
                <li><b>Hear from neighbors</b> by email, and keep everything you earn.</li>
              </ol>
              <div className="hero-actions">
                <Link href="/apply" className="btn btn-gold">Offer a service</Link>
                <Link href="/how-it-works" className="btn btn-ghost">Learn more</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* On the board */}
      <section className="section">
        <div className="wrap">
          <div className="section-head row-head">
            <div>
              <p className="eyebrow">On the board</p>
              <h2>Latest listings</h2>
            </div>
            <Link href="/listings" className="text-link">See all <ArrowIcon /></Link>
          </div>
          <div className="grid-3">
            {recent.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="section bg-cream">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Safety</p>
            <h2>Neighbors only, parents in the loop</h2>
            <p>{site.name} is built for kids running their first business, so a few rules are non-negotiable.</p>
          </div>
          <div className="grid-3">
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><ShieldCheckIcon /></IconRing>
              <div>
                <h3>Only {site.community}</h3>
                <p>Every student and resident address is checked to be inside the neighborhood.</p>
              </div>
            </div>
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><GuardianIcon /></IconRing>
              <div>
                <h3>Guardian sign-off</h3>
                <p>No student listing goes live until a parent or guardian approves it.</p>
              </div>
            </div>
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><MailIcon /></IconRing>
              <div>
                <h3>Email, not phone numbers</h3>
                <p>Contact happens by email, and guardians get a copy of every message.</p>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 28 }}>
            <Link href="/how-it-works#safety" className="text-link">What we do and don&apos;t check <ArrowIcon /></Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="wrap faq-wrap">
          <div className="section-head">
            <p className="eyebrow">Questions</p>
            <h2>Good to know</h2>
            <p>More answers on the <Link href="/how-it-works#faq">How it works</Link> page.</p>
          </div>
          <Faq limit={4} />
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Got a skill? Your neighbors are looking.</h2>
              <p>Listing a service is free, and you keep every dollar you earn.</p>
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
