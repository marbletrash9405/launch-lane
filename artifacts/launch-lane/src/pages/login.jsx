import { Link } from "wouter";
import GoogleSignIn from "@/components/GoogleSignIn";
import { site } from "@/lib/site";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card">
          <h1>Log in</h1>
          <p className="login-note">Welcome back to {site.name}.</p>

          <GoogleSignIn label="Continue with Google" />

          <p className="auth-switch">
            New to {site.name}? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
