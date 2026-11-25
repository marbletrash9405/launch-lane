import { Link } from "wouter";
import ListingCard from "@/components/ListingCard";
import CategoryIcon from "@/components/CategoryIcon";
import Faq from "@/components/Faq";
import { categories } from "@/data/categories";
import { site } from "@/lib/site";
import { IconRing, ShieldCheckIcon, GuardianIcon, MailIcon, ArrowIcon } from "@/components/Icons";
import { useGetPublicBusinesses, getGetPublicBusinessesQueryKey } from "@workspace/api-client-react";
import { useMemo } from "react";

export default function Home() {
  const { data, isLoading, isError, refetch } = useGetPublicBusinesses({
    query: { queryKey: getGetPublicBusinessesQueryKey() },
  });
  const recent = useMemo(() => (data?.businesses ?? []).slice(0, 6).map((business) => ({
    ...business,
    type: "offering",
    title: business.name,
    name: business.studentName,
    description: business.description,
    pricingText: business.pricingText,
  })), [data?.businesses]);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <h1>{site.name}</h1>
          <p className="hero-sub">for {site.community}</p>
          <div className="hero-rule" />
          <p className="hero-tag">
            Need a babysitter, help with yard work, or an extra hand moving furniture? Explore
            businesses and services offered by {site.community} students, or post what you need
            and hear from students who&apos;d like to help.
          </p>
        </div>
      </section>

      {/* Work, your way */}
      <section className="section">
        <div className="wrap">
          <div className="section-head wide">
            <h2>Work, your way.</h2>
            <p>
              Good at mowing lawns, cleaning up trash, or creating social media content? Already
              making and selling your own jewelry?
            </p>
            <p>
              List your services, introduce your business to {site.community} neighbors, or apply
              for jobs they post. Earn money doing what you&apos;re good at and build experience
              close to home.
            </p>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c} href={`/explore?category=${encodeURIComponent(c)}`} className="cat-tile">
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
              <h3>Find it close to home</h3>
              <ol className="mini-steps">
                <li><b>Browse listings or post a job</b> with your timing and what you&apos;re offering to pay.</li>
                <li><b>Connect with a student</b> in a Launch Lane group chat with their parent or guardian.</li>
                <li><b>Agree on the details,</b> then pay the student directly.</li>
              </ol>
              <div className="hero-actions">
                <Link href="/explore" className="btn btn-teal">Browse services</Link>
                <Link href="/residents#post-a-job" className="btn btn-outline">Post a job</Link>
              </div>
            </div>
            <div className="path-card path-student">
              <p className="path-for">For students</p>
              <h3>Put your skills to work close to home</h3>
              <ol className="mini-steps">
                <li><b>Tell us what you offer</b> and add your guardian&apos;s contact details.</li>
                <li><b>Get your guardian&apos;s approval,</b> and your listing goes live.</li>
                <li><b>Connect with neighbors,</b> get paid directly, and keep 100% of what you earn.</li>
              </ol>
              <div className="hero-actions">
                <Link href="/students#apply" className="btn btn-gold">Offer a service</Link>
                <Link href="/students" className="btn btn-ghost">Learn more</Link>
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
              <p className="eyebrow">Explore Services</p>
              <h2>Live neighborhood listings</h2>
            </div>
            <Link href="/explore" className="text-link">See all <ArrowIcon /></Link>
          </div>
          <div className="grid-3">
            {isLoading ? <div className="listing-skeleton" data-testid="loading-public-listings">Loading local services…</div> :
              isError ? <div className="empty" role="alert" data-testid="error-public-listings">We couldn&apos;t load listings. <button type="button" className="text-button" onClick={() => refetch()} data-testid="button-retry-public-listings">Try again</button></div> :
              recent.length ? recent.map((l) => <ListingCard key={l.id} listing={l} />) :
                <div className="empty" data-testid="empty-public-listings">There are no live services to show just yet.</div>}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="section bg-cream">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Safety</p>
            <h2>Neighbors only, guardians in the loop</h2>
          </div>
          <div className="grid-3">
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><ShieldCheckIcon /></IconRing>
              <div>
                <h3>Only {site.community}</h3>
                <p>We check that every address falls within {site.community}.</p>
              </div>
            </div>
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><GuardianIcon /></IconRing>
              <div>
                <h3>Guardian sign-off</h3>
                <p>Guardians review and sign off on every student listing and every job their student takes.</p>
              </div>
            </div>
            <div className="feature feature-row" style={{ background: "var(--white)" }}>
              <IconRing><MailIcon /></IconRing>
              <div>
                <h3>Group chats with guardians</h3>
                <p>Students and neighbors arrange work in a Launch Lane group chat that includes the student's parent or guardian.</p>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 28 }}>
            <Link href="/how-it-works#before-you-agree" className="text-link">Before you agree to a job <ArrowIcon /></Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="wrap faq-wrap">
          <div className="section-head">
            <p className="eyebrow">Questions</p>
            <h2>Good to know</h2>
            <p>See every answer on the <Link href="/faq">FAQ page</Link>.</p>
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
              <Link href="/students#apply" className="btn btn-gold">Offer a service</Link>
              <Link href="/residents#post-a-job" className="btn btn-ghost">Post a job</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
