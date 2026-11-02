import Link from "next/link";
import ListingsBrowser from "@/components/ListingsBrowser";
import { listings } from "@/data/listings";
import { site } from "@/lib/site";

export const metadata = { title: "Browse listings" };

export default function ListingsPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Browse</p>
          <h1>Services &amp; requests</h1>
          <p>Every student listing is guardian-approved and limited to {site.community}. Reach out by email to talk details.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <ListingsBrowser listings={listings} />
          <div className="hero-actions" style={{ marginTop: 40 }}>
            <Link href="/apply" className="btn btn-teal">Offer a service</Link>
            <Link href="/request" className="btn btn-outline">Post a request</Link>
          </div>
        </div>
      </section>
    </>
  );
}
