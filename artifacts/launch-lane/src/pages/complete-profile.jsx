import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function responseError(data, fallback) {
  return typeof data?.error === "string" ? data.error : fallback;
}

export default function CompleteProfilePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [account, setAccount] = useState(null);
  const [age, setAge] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestedRole = new URLSearchParams(window.location.search).get("role");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/login");
      return;
    }

    let active = true;
    async function loadAccount() {
      try {
        const response = requestedRole
          ? await fetch("/api/auth/register", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: requestedRole }),
            })
          : await fetch("/api/auth/me", { credentials: "include" });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) {
            setLocation("/signup");
            return;
          }
          throw new Error(responseError(data, "We couldn't load your account."));
        }
        if (!active) return;
        if (data.profileComplete) {
          setLocation("/dashboard");
          return;
        }
        setAccount(data);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "We couldn't load your account.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAccount();
    return () => { active = false; };
  }, [isLoaded, isSignedIn, requestedRole, setLocation]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const profile = account?.role === "student"
      ? { age: Number(age), homeAddress, guardianName, guardianEmail }
      : { homeAddress };
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "We couldn't save your profile."));
      setLocation("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !isLoaded || !account) {
    return (
      <section className="section bg-cream login-section">
        <div className="wrap"><div className="login-card"><p>Loading your profile…</p></div></div>
      </section>
    );
  }

  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card profile-card">
          <h1>Complete your {account.role} profile</h1>
          <p className="login-note">Your address and account details stay private.</p>
          <form className="form profile-form" onSubmit={saveProfile}>
            {account.role === "student" && (
              <>
                <label>
                  Age
                  <input
                    type="number"
                    min="13"
                    max="18"
                    step="1"
                    required
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                  />
                </label>
                <label>
                  Home address
                  <textarea
                    autoComplete="street-address"
                    required
                    maxLength="300"
                    rows="3"
                    value={homeAddress}
                    onChange={(event) => setHomeAddress(event.target.value)}
                  />
                </label>
                <label>
                  Guardian name
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    maxLength="120"
                    value={guardianName}
                    onChange={(event) => setGuardianName(event.target.value)}
                  />
                </label>
                <label>
                  Guardian email
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength="254"
                    value={guardianEmail}
                    onChange={(event) => setGuardianEmail(event.target.value)}
                  />
                </label>
              </>
            )}
            {account.role === "resident" && (
              <label>
                Home address
                <textarea
                  autoComplete="street-address"
                  required
                  maxLength="300"
                  rows="3"
                  value={homeAddress}
                  onChange={(event) => setHomeAddress(event.target.value)}
                />
              </label>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-teal" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
