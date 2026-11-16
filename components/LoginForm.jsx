"use client";

import { useState } from "react";

// Placeholder only: there are no accounts yet, so this never sends anything.
export default function LoginForm() {
  const [tried, setTried] = useState(false);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
      }}
    >
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input className="input" id="login-email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input className="input" id="login-password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-teal">Log in</button>
      {tried && (
        <p className="demo-note" role="status">Log in isn&apos;t available yet. Check back soon.</p>
      )}
    </form>
  );
}
