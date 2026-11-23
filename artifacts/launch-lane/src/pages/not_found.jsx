import { Link } from "wouter";

export default function NotFound() {
  return (
    <section className="page-head" style={{ padding: "100px 0" }}>
      <div className="wrap">
        <p className="eyebrow">404</p>
        <h1>Wrong lane</h1>
        <p>That page doesn&apos;t exist.</p>
        <p style={{ marginTop: 24 }}><Link href="/" className="btn btn-gold">Back home</Link></p>
      </div>
    </section>
  );
}
