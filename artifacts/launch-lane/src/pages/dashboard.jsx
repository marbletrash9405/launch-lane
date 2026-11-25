import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/login");
      return;
    }

    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) {
            setLocation("/signup");
            return null;
          }
          throw new Error(data?.error || "We couldn't load your Launch Lane account.");
        }
        return data;
      })
      .then((data) => {
        if (!active || !data) return;
        if (!data.profileComplete) {
          setLocation("/complete-profile");
          return;
        }
        setAccount(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "We couldn't load your account.");
      });

    return () => { active = false; };
  }, [isLoaded, isSignedIn, setLocation]);

  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card dashboard-card">
          <h1>Dashboard</h1>
          {error ? (
            <p className="form-error" role="alert">{error}</p>
          ) : account ? (
            <p>
              You are signed in as a <strong>{account.role}</strong>.
            </p>
          ) : (
            <p className="login-note">Loading your account…</p>
          )}
          {account?.role === "admin" && (
            <p className="login-note">Admin access is limited to the account configured for Launch Lane.</p>
          )}
          <Link href="/" className="btn btn-outline">Back to Launch Lane</Link>
        </div>
      </div>
    </section>
  );
}
