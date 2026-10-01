import type { EvidenceStep } from '../lib/types.ts';

export default function EvidenceTrail({ steps }: { steps: EvidenceStep[] }) {
  return (
    <section className="block" aria-labelledby="trail-title">
      <h3 id="trail-title">كيف وصلنا لهذه النتيجة؟</h3>
      <ol className="trail">
        {steps.map((s, i) => (
          <li key={i}>
            <div>
              {s.label}
              {s.detail ? <small>{s.detail}</small> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
