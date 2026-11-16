import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import { authConfigured } from "@/auth";
import { site } from "@/lib/site";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }) {
  const { error } = (await searchParams) || {};

  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card">
          <h1>Log in</h1>
          <p className="login-note">Welcome back to {site.name}.</p>

          {error && authConfigured && (
            <p className="form-error" role="alert">Sign-in didn&apos;t work. Please try again.</p>
          )}

          <GoogleButton label="Continue with Google" enabled={authConfigured} />

          {!authConfigured && (
            <p className="demo-note">Google sign-in is almost ready. Check back soon.</p>
          )}

          <p className="auth-switch">
            New to {site.name}? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
