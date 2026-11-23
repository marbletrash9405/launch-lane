// Numbered vertical steps with a connecting line.
export default function Steps({ steps, accent = "" }) {
  return (
    <ol className="v-steps">
      {steps.map((s, i) => (
        <li key={s.t}>
          <span className={`v-num ${accent}`}>{i + 1}</span>
          <div>
            <h3>{s.t}</h3>
            <p>{s.b}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
