import { Link } from "wouter";
import SignupForm from "@/components/SignupForm";
import { site } from "@/lib/site";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card">
          <h1>Sign up</h1>
          <p className="login-note">Create your {site.name} account with Google.</p>

          <SignupForm community={site.community} />

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
