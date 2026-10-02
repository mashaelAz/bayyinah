'use client';

import type { TextDiff } from '../lib/types.ts';
import { useI18n } from '../lib/i18n/index.tsx';

export default function DiffView({ diff, bare = false }: { diff: TextDiff; bare?: boolean }) {
  const { t } = useI18n();
  const body = (
    <>
      <div className="diff-grid">
        <div>
          <div className="fine">{t('diff.circulating')}</div>
          <p className="diff-text" lang="ar">
            {diff.circulating.map((tok, i) => (
              <span key={i}>
                <span className={tok.op === 'added' ? 'tok-added' : undefined}>{tok.text}</span>{' '}
              </span>
            ))}
          </p>
        </div>
        <div>
          <div className="fine">{t('diff.source')}</div>
          <p className="diff-text" lang="ar">
            {diff.source.map((tok, i) => (
              <span key={i}>
                <span className={tok.op === 'removed' ? 'tok-removed' : undefined}>{tok.text}</span>{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--added)' }} />
          {t('diff.legendAdded')}
        </span>
        <span>
          <i style={{ background: 'var(--removed)' }} />
          {t('diff.legendRemoved')}
        </span>
      </div>
      <p className="fingerprint">
        {diff.addedCount > 0 ? t('diff.added', { n: diff.addedCount, pct: diff.differencePercent }) : t('diff.noneAdded')}{' '}
        {diff.removedCount > 0 ? t('diff.removed', { n: diff.removedCount }) : ''}
      </p>
      <p className="fine" style={{ marginBottom: 0 }}>
        {t('diff.note')}
      </p>
    </>
  );
  if (bare) return body;
  return (
    <section className="block" aria-labelledby="diff-title">
      <h3 id="diff-title">{t('diff.title')}</h3>
      {body}
    </section>
  );
}
