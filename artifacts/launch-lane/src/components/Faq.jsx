import { faq } from "@/data/faq";

export default function Faq({ items = faq, limit }) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="faq">
      {shown.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          {(Array.isArray(f.a) ? f.a : [f.a]).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </details>
      ))}
    </div>
  );
}
