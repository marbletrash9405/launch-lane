"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, useAuth } from "@clerk/react";
import { useLocation } from "wouter";

function GoogleG() {
  // Google's standard multicolor "G" sign-in mark.
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * Keeps the original Launch Lane button while using Clerk's branded Google flow.
 */
export default function GoogleSignIn({ label, role, redirectTo = "/" }) {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const signupDestination = `${basePath}/complete-profile?role=${encodeURIComponent(role || "")}`;
  const loginDestination = `${basePath}${redirectTo}`;

  async function registerExistingSession() {
    setBusy(true);
    setError("");
    try {
      if (!role) {
        setLocation(redirectTo);
        return;
      }
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't finish setting up your account.");
      setLocation(data.profileComplete ? "/dashboard" : "/complete-profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't finish signing in.");
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <button
      type="button"
      className="google-btn"
      onClick={registerExistingSession}
      disabled={!isLoaded || busy}
    >
      <GoogleG />
      {busy ? "Setting up your account…" : label}
    </button>
  );

  return (
    <div className="form" style={{ gap: 12 }}>
      {isLoaded && isSignedIn ? (
        button
      ) : role ? (
        <SignUpButton
          mode="modal"
          forceRedirectUrl={signupDestination}
          fallbackRedirectUrl={signupDestination}
        >
          <button type="button" className="google-btn" disabled={!isLoaded}>
            <GoogleG />
            {label}
          </button>
        </SignUpButton>
      ) : (
        <SignInButton
          mode="modal"
          forceRedirectUrl={loginDestination}
          fallbackRedirectUrl={loginDestination}
        >
          <button type="button" className="google-btn" disabled={!isLoaded}>
            <GoogleG />
            {label}
          </button>
        </SignInButton>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
