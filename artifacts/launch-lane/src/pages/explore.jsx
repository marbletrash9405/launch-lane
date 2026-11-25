import { Link } from "wouter";
import ListingsBrowser from "@/components/ListingsBrowser";
import { site } from "@/lib/site";
import { useGetPublicBusinesses, getGetPublicBusinessesQueryKey } from "@workspace/api-client-react";
import { useMemo } from "react";

export const metadata = { title: "Explore Services" };

export default function ListingsPage() {
  const { data, isLoading, isError, refetch } = useGetPublicBusinesses({
    query: { queryKey: getGetPublicBusinessesQueryKey() },
  });
  const listings = useMemo(() => (data?.businesses ?? []).map((business) => ({
    ...business,
    type: "offering",
    title: business.name,
    name: business.studentName,
  })), [data?.businesses]);
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
          {isLoading ? <div className="empty" data-testid="loading-explore-listings">Loading local services…</div> :
            isError ? <div className="empty" role="alert" data-testid="error-explore-listings">We couldn&apos;t load listings. <button type="button" className="text-button" onClick={() => refetch()} data-testid="button-retry-explore-listings">Try again</button></div> :
              <ListingsBrowser listings={listings} />}
          <div className="hero-actions" style={{ marginTop: 40 }}>
            <Link href="/students#apply" className="btn btn-teal">Offer a service</Link>
            <Link href="/residents#post-a-job" className="btn btn-outline">Post a job</Link>
          </div>
        </div>
      </section>
    </>
  );
}
