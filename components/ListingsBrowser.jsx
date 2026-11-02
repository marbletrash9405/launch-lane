"use client";

import { useMemo, useState } from "react";
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

  const shown = useMemo(
    () =>
      listings.filter(
        (l) => (tab === "all" || l.type === tab) && (!category || l.category === category)
      ),
    [listings, tab, category]
  );

  return (
    <>
      <div className="filters">
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

      {shown.length ? (
        <div className="grid-3">
          {shown.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      ) : (
        <div className="empty">Nothing here yet. Check back soon, or post a request.</div>
      )}
    </>
  );
}
