import RequestButton from "./RequestButton";

export default function ListingCard({ listing }) {
  const isOffer = listing.type === "offering";

  return (
    <article className={`listing ${isOffer ? "offering" : "job"}`} data-testid={`card-listing-${listing.id}`}>
      <span className={`pill ${isOffer ? "pill-offer" : "pill-job"}`}>
        {isOffer ? "Student service" : "Job"}
      </span>
      <div>
        <h3 data-testid={`text-listing-title-${listing.id}`}>{listing.title}</h3>
        <p className="cat" data-testid={`text-listing-category-${listing.id}`}>{listing.category}</p>
      </div>
      <p className="desc" data-testid={`text-listing-description-${listing.id}`}>{listing.description}</p>

      {listing.pricingText && <p className="listing-price" data-testid={`text-listing-price-${listing.id}`}>{listing.pricingText}</p>}

      {listing.photoUrls?.length > 0 && (
        <div className="public-listing-photos" data-testid={`photos-listing-${listing.id}`}>
          {listing.photoUrls.slice(0, 3).map((url, index) => <img key={`${url}-${index}`} src={url} alt="" loading="lazy" data-testid={`img-listing-${listing.id}-${index}`} />)}
        </div>
      )}

      {!isOffer && (listing.timing || listing.pay) && (
        <dl className="job-meta">
          {listing.timing && (<><dt>When</dt><dd>{listing.timing}</dd></>)}
          {listing.pay && (<><dt>Pay</dt><dd>{listing.pay}</dd></>)}
        </dl>
      )}

      {isOffer && !listing.pricingText && (
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
