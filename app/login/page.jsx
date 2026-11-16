import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <section className="section bg-cream login-section">
      <div className="wrap">
        <div className="login-card">
          <h1>Log in</h1>
          <p className="login-note">
            Accounts are coming soon. For now, students can <Link href="/students#apply">offer a service</Link>{" "}
            and neighbors can <Link href="/hirers#post-a-job">post a job</Link> without logging in.
          </p>
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
