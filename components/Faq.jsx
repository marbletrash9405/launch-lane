import { faq } from "@/data/faq";

export default function Faq({ limit }) {
  const items = limit ? faq.slice(0, limit) : faq;
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
