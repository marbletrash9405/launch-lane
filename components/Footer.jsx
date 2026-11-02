import Link from "next/link";
import { site, nav, navCta } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src={site.logoMark} alt="" />
              <div>
                <strong>{site.name}</strong>
                <small>for {site.community}</small>
              </div>
            </div>
            <p style={{ maxWidth: 360 }}>{site.tagline}</p>
          </div>
          <nav aria-label="Footer">
            {[...nav, navCta].map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
            <a href={`mailto:${site.contactEmail}`}>Contact</a>
          </nav>
        </div>
        <p className="footer-small">
          {site.name} connects students (18 &amp; under) and residents in {site.community}. It
          isn&apos;t a party to any job: work, payment, insurance and safety arrangements are made
          directly between the student, their guardian and the resident. Terms and conditions apply. © {new Date().getFullYear()} {site.name}.
        </p>
      </div>
    </footer>
  );
}
