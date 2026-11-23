"use client";

import { Link } from "wouter";
import { useState } from "react";

/**
 * Sends a form to /api/submit, which emails it to the Launch Lane team first.
 * `kind` must match a form in lib/forms.js.
 */
export default function SubmitForm({
  kind,
  listingId,
  children,
  successTitle,
  successBody,
  submitLabel,
  submitClass = "btn-teal",
  compact = false,
  onDone,
}) {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, listingId, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setStatus("sent");
        if (!compact) window.scrollTo({ top: e.currentTarget?.offsetTop ?? 0, behavior: "smooth" });
        return;
      }
      setStatus("error");
      setMessage(
        json.error === "not_configured"
          ? "Sorry, we can't accept submissions just yet. Please check back soon."
          : json.error || "Something went wrong. Please try again."
      );
    } catch {
      setStatus("error");
      setMessage("Couldn't connect. Check your internet and try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="success" role="status">
        <h2>{successTitle}</h2>
        <p>{successBody}</p>
        <p style={{ marginTop: 22 }}>
          {onDone ? (
            <button type="button" className="btn btn-teal" onClick={onDone}>Done</button>
          ) : (
            <Link href="/explore" className="btn btn-teal">Explore Services</Link>
          )}
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {/* Spam trap: hidden from people, often filled in by bots. */}
      <div className="hp" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {children}
      {status === "error" && <p className="form-error" role="alert">{message}</p>}
      <div>
        <button type="submit" className={`btn ${submitClass}`} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
