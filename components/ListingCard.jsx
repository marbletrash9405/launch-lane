export default function ListingCard({ listing }) {
  const isOffer = listing.type === "offering";
  const subject = encodeURIComponent(`Launch Lane: ${listing.title}`);

  return (
    <article className={`listing ${isOffer ? "offering" : "request"}`}>
      <span className={`pill ${isOffer ? "pill-offer" : "pill-request"}`}>
        {isOffer ? "Offering" : "Looking for"}
      </span>
      <div>
        <h3>{listing.title}</h3>
        <p className="cat">{listing.category}</p>
      </div>
      <p className="desc">{listing.description}</p>

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
        <a
          className={`btn btn-sm ${isOffer ? "btn-teal" : "btn-blue"}`}
          href={`mailto:${listing.email}?subject=${subject}`}
        >
          Email
        </a>
      </div>
    </article>
  );
}
