import RequestButton from "./RequestButton";

export default function ListingCard({ listing }) {
  const isOffer = listing.type === "offering";

  return (
    <article className={`listing ${isOffer ? "offering" : "job"}`}>
      <span className={`pill ${isOffer ? "pill-offer" : "pill-job"}`}>
        {isOffer ? "Student service" : "Job"}
      </span>
      <div>
        <h3>{listing.title}</h3>
        <p className="cat">{listing.category}</p>
      </div>
      <p className="desc">{listing.description}</p>

      {!isOffer && (listing.timing || listing.pay) && (
        <dl className="job-meta">
          {listing.timing && (<><dt>When</dt><dd>{listing.timing}</dd></>)}
          {listing.pay && (<><dt>Pay</dt><dd>{listing.pay}</dd></>)}
        </dl>
      )}

      {isOffer && (
        <div className="stars" aria-label={listing.reviews ? `${listing.rating} out of 5 stars` : "No reviews yet"}>
          <span aria-hidden="true">
            {"★".repeat(Math.round(listing.rating))}
            {"☆".repeat(5 - Math.round(listing.rating))}
          </span>
          <small>{listing.reviews ? `${listing.reviews} reviews` : "No reviews yet"}</small>
        </div>
      )}

      <div className="listing-foot">
        <div className="who">
          <strong>{listing.name}</strong>
          {isOffer ? "Student" : `${listing.street}, Mercer Crossing`}
        </div>
        <RequestButton listing={listing} />
      </div>
    </article>
  );
}
