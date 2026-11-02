"use client";

import { useEffect, useMemo, useState } from "react";
import ListingCard from "./ListingCard";
import { categories } from "@/data/listings";

const TABS = [
  { id: "all", label: "All" },
  { id: "offering", label: "Offering" },
  { id: "request", label: "Looking for" },
];

export default function ListingsBrowser({ listings }) {
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  // Support links like /listings?category=Pet%20care from the home page.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("category");
    if (c && categories.includes(c)) setCategory(c);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(
      (l) =>
        (tab === "all" || l.type === tab) &&
        (!category || l.category === category) &&
        (!q || `${l.title} ${l.description} ${l.category}`.toLowerCase().includes(q))
    );
  }, [listings, tab, category, query]);

  return (
    <>
      <div className="filters">
        <input
          className="input search"
          type="search"
          placeholder="Search listings, e.g. lawn, dog, tutoring"
          aria-label="Search listings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tabs" role="group" aria-label="Listing type">
          {TABS.map((t) => (
            <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="select"
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="result-count">
        {shown.length} {shown.length === 1 ? "listing" : "listings"}
      </p>

      {shown.length ? (
        <div className="grid-3">
          {shown.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      ) : (
        <div className="empty">
          Nothing matches yet. Try another search, or <a href="/request">post a request</a> so students can find you.
        </div>
      )}
    </>
  );
}
