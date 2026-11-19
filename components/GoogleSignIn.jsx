"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseConfigured } from "@/lib/firebase-config";

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
 * "Continue with Google" / "Sign up with Google" button backed by Firebase Authentication.
 * Pass `role` on the Sign up page so it's saved to the person's Firestore profile.
 */
export default function GoogleSignIn({ label, role, redirectTo = "/" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Finish a sign-in that fell back to a full-page redirect (popup blocked).
  useEffect(() => {
    if (!firebaseConfigured) return;
    let alive = true;
    import("@/lib/firebase").then(async (fb) => {
      try {
        const user = await fb.finishRedirectSignIn();
        if (user && alive) router.push(redirectTo);
      } catch (e) {
        if (alive) setError(fb.signInErrorMessage(e) || "");
      }
    });
    return () => { alive = false; };
  }, [router, redirectTo]);

  async function handleClick() {
    setBusy(true);
    setError("");
    const fb = await import("@/lib/firebase");
    try {
      const user = await fb.signInWithGoogle(role);
      if (user) router.push(redirectTo);
    } catch (e) {
      setError(fb.signInErrorMessage(e) || "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form" style={{ gap: 12 }}>
      <button type="button" className="google-btn" onClick={handleClick} disabled={!firebaseConfigured || busy}>
        <GoogleG />
        {busy ? "Opening Google…" : label}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!firebaseConfigured && (
        <p className="demo-note">Google sign-in is almost ready. Check back soon.</p>
      )}
    </div>
  );
}
