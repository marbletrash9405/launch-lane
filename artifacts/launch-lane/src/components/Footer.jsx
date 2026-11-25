import { Link } from "wouter";
import { site, nav, navCta } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src={site.logoMark} alt="" />
              <strong>{site.name}</strong>
            </div>
            <p style={{ maxWidth: 360 }}>{site.tagline}</p>
          </div>
          <nav aria-label="Footer">
            {[...nav, navCta].map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
            <a href={`mailto:${site.contactEmail}`}>Contact</a>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
        <p className="footer-small">
          {site.name} connects students ages 13 to 18 and residents in {site.community},{" "}
          {site.location}. It isn&apos;t a party to any job: the scope of work, payment, insurance and
          safety arrangements are agreed directly between the student, their guardian and the
          neighbor. Terms and conditions apply. © {new Date().getFullYear()} {site.name}.
        </p>
      </div>
    </footer>
  );
}
