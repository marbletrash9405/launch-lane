import Faq from "@/components/Faq";
import { faqGroups } from "@/data/faq";
import { site } from "@/lib/site";

export const metadata = { title: "FAQs" };

export default function FaqPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">FAQs</p>
          <h1>Frequently asked questions</h1>
          <p>
            Something not covered? <a href={`mailto:${site.contactEmail}`} className="on-dark">Email us</a>.
          </p>
        </div>
      </section>

      {faqGroups.map((g, i) => (
        <section className={`section${i % 2 ? " bg-cream" : ""}`} key={g.title}>
          <div className="wrap faq-wrap">
            <div className="section-head">
              <h2>{g.title}</h2>
            </div>
            <Faq items={g.items} />
          </div>
        </section>
      ))}
    </>
  );
}
