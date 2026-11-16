"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Wraps a form and shows a thank-you state on submit.
 *
 * NOTE: Submissions are NOT saved anywhere yet. To collect real
 * applications, point `onSubmit` at a form service or API route
 * (see README → "Connecting the forms").
 */
export default function DemoForm({ children, successTitle, successBody, submitLabel, submitClass = "btn-teal" }) {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: send new FormData(e.currentTarget) to your backend here.
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sent) {
    return (
      <div className="success" role="status">
        <h2>{successTitle}</h2>
        <p>{successBody}</p>
        <p className="demo-note" style={{ marginTop: 18 }}>
          Preview mode: this form isn&apos;t connected yet, so nothing was actually sent.
        </p>
        <p style={{ marginTop: 22 }}>
          <Link href="/explore" className="btn btn-teal">Explore listings</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {children}
      <div>
        <button type="submit" className={`btn ${submitClass}`}>{submitLabel}</button>
      </div>
    </form>
  );
}
