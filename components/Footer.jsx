import Link from "next/link";
import { site, nav } from "@/lib/site";

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
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
            <a href={`mailto:${site.contactEmail}`}>Contact</a>
          </nav>
        </div>
        <p className="footer-small">
          For students 18 &amp; under and residents of {site.community}. Payments and work
          arrangements stay between the student and resident; {site.name} takes no share.
          Terms and conditions apply. © {new Date().getFullYear()} {site.name}.
        </p>
      </div>
    </footer>
  );
}
