import Link from "next/link";
import ListingsBrowser from "@/components/ListingsBrowser";
import { publicListings as listings } from "@/data/listings";
import { site } from "@/lib/site";

export const metadata = { title: "Explore Services" };

export default function ListingsPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Explore Services</p>
          <h1>Student services &amp; neighborhood jobs</h1>
          <p>See what {site.community} students offer, or find a job a neighbor posted and apply by email.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <ListingsBrowser listings={listings} />
          <div className="hero-actions" style={{ marginTop: 40 }}>
            <Link href="/students#apply" className="btn btn-teal">Offer a service</Link>
            <Link href="/residents#post-a-job" className="btn btn-outline">Post a job</Link>
          </div>
        </div>
      </section>
    </>
  );
}
