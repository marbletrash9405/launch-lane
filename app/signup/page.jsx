import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import { authConfigured } from "@/auth";
import { site } from "@/lib/site";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card">
          <h1>Sign up</h1>
          <p className="login-note">Create your {site.name} account with Google.</p>

          <SignupForm enabled={authConfigured} community={site.community} />

          {!authConfigured && (
            <p className="demo-note">Google sign-up is almost ready. Check back soon.</p>
          )}

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
