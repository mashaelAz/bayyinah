import type { TextDiff } from '../lib/types.ts';

export default function DiffView({ diff }: { diff: TextDiff }) {
  return (
    <section className="block" aria-labelledby="diff-title">
      <h3 id="diff-title">بصمة النص: ما الذي تغيّر؟</h3>
      <div className="diff-grid">
        <div>
          <div className="fine">النص المتداول</div>
          <p className="diff-text">
            {diff.circulating.map((t, i) => (
              <span key={i}>
                <span className={t.op === 'added' ? 'tok-added' : undefined}>{t.text}</span>{' '}
              </span>
            ))}
          </p>
        </div>
        <div>
          <div className="fine">النص في المصدر</div>
          <p className="diff-text">
            {diff.source.map((t, i) => (
              <span key={i}>
                <span className={t.op === 'removed' ? 'tok-removed' : undefined}>{t.text}</span>{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--added)' }} />
          مضاف أو مغيّر في النص المتداول
        </span>
        <span>
          <i style={{ background: 'var(--removed)' }} />
          موجود في المصدر وغير موجود في النص المتداول
        </span>
      </div>
      <p className="fingerprint">
        {diff.addedCount > 0
          ? `تم رصد ${diff.addedCount} كلمة مضافة أو مغيّرة في النص المتداول، أي اختلاف في ${diff.differencePercent}% من صياغته.`
          : 'لم نرصد كلمات مضافة في النص المتداول.'}
        {diff.removedCount > 0 ? ` وسقطت منه ${diff.removedCount} كلمة موجودة في المصدر.` : ''}
      </p>
      <p className="fine">هذه النسبة فرق في الألفاظ فقط، ولا تمثل حكمًا على الحديث.</p>
    </section>
  );
}
