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
          <h1>Find help nearby</h1>
          <p>Services from {site.community} students and requests from neighbors. Find one that fits and tap Email to talk details.</p>
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
