'use client';

import type { VerificationResult, ResultStatus } from '../lib/types.ts';
import { gradeTone } from '../lib/grades.ts';
import { matchableSourceText } from '../lib/display.ts';
import { gradeGloss, useI18n } from '../lib/i18n/index.tsx';
import type { MessageKey } from '../lib/i18n/ar.ts';
import DiffView from './DiffView';
import EvidenceTrail from './EvidenceTrail';
import ShareBox from './ShareBox';
import CorrectionCard from './CorrectionCard';

interface Props {
  result: VerificationResult;
  onRetry?: () => void;
  onEdit?: () => void;
}

const TYPE_NOTE: Partial<Record<VerificationResult['extraction']['contentType'], MessageKey>> = {
  unknown: 'type.unknown',
  quran: 'type.quran',
  dua: 'type.dua',
  athar: 'type.athar',
  saying: 'type.saying',
};

export default function ResultCard({ result, onRetry, onEdit }: Props) {
  const { t, lang } = useI18n();
  const { status, best, extraction, diff } = result;
  const grade = best?.record.grade?.trim() || null;
  const tone = gradeTone(grade);
  const gloss = gradeGloss(lang, grade);
  const pct = best ? Math.round(best.similarity * 100) : 0;
  const showOriginal = extraction.searchText.trim() !== extraction.originalText.trim();
  const typeKey = TYPE_NOTE[extraction.contentType];
  const cached = !result.provider.live;

  function explanation(s: ResultStatus): string {
    switch (s) {
      case 'verified_match': {
        const head = best?.isPartOfSource ? t('exp.verifiedPart') : t('exp.verifiedFull');
        const tail =
          grade && best
            ? t('exp.gradeBy', { scholar: best.record.scholar, source: best.record.source, grade })
            : t('exp.noGrade');
        return `${head} ${tail}`;
      }
      case 'wording_variant':
        return t('exp.variant');
      case 'needs_review':
        return result.rulingsDiffer ? t('exp.reviewConflict') : t('exp.reviewPartial');
      case 'not_found':
        return t('exp.notFound');
      case 'source_unavailable':
        return t('exp.unavailable');
    }
  }

  const needsHelp = status === 'needs_review' || status === 'not_found' || status === 'source_unavailable';

  return (
    <article className="result" aria-live="polite" aria-labelledby="result-status">
      <div className="result-head">
        <span id="result-status" className={`status status-${status}`}>
          {t(`status.${status}`)}
        </span>
        {best ? (
          <a className="source-badge" href={best.record.source_url} target="_blank" rel="noopener noreferrer">
            {cached ? t('badge.cached') : t('badge.live')}
          </a>
        ) : null}
      </div>

      <p className="explain">{explanation(status)}</p>

      <CorrectionCard result={result} />

      {typeKey ? <div className="alert alert-info">{t(typeKey)}</div> : null}
      {result.provider.fallbackUsed ? <div className="alert alert-info">{t('fallback.note')}</div> : null}

      <section className="block" aria-labelledby="checked-title">
        <h3 id="checked-title">{t('r.checked')}</h3>
        <p className="quote">{extraction.searchText}</p>
        {showOriginal ? (
          <details className="raw" style={{ marginTop: 10 }}>
            <summary>{t('r.showOriginal')}</summary>
            <p className="quote" style={{ whiteSpace: 'pre-line', fontSize: 18, marginBottom: 0 }}>
              {extraction.originalText}
            </p>
          </details>
        ) : null}
        {extraction.attribution ? (
          <p className="fine" style={{ marginBottom: 0 }}>
            {t('r.attribution', { text: extraction.attribution })}
          </p>
        ) : null}
      </section>

      {extraction.extraPhrases.length ? (
        <section className="block" aria-labelledby="extras-title">
          <h3 id="extras-title">{t('r.extras')}</h3>
          <div className="extras">
            {extraction.extraPhrases.map((p, i) => (
              <span key={i}>{p}</span>
            ))}
          </div>
          <p className="fine" style={{ marginBottom: 0 }}>
            {t('r.extrasNote')}
          </p>
        </section>
      ) : null}

      {best ? (
        <>
          <section className="block quote-source" aria-labelledby="source-title">
            <h3 id="source-title">{t('r.sourceText')}</h3>
            <p className="quote">{matchableSourceText(best.record.text)}</p>
          </section>

          <div className="ruling">
            <span className="label">{t('r.rulingLabel')}</span>
            <span className={`grade tone-${grade ? tone : 'neutral'}`} lang="ar">
              {grade ?? t('r.noGrade')}
            </span>
            {gloss ? (
              <span className="gloss">
                {t('r.gloss')}: {gloss}
              </span>
            ) : null}
            <span className="note">
              {t('r.rulingNote')} {status === 'wording_variant' ? t('r.rulingVariant') : ''}
            </span>
          </div>

          <section className="block" aria-labelledby="meta-title">
            <h3 id="meta-title">{t('r.meta')}</h3>
            <dl className="meta">
              <div>
                <dt>{t('r.narrator')}</dt>
                <dd lang="ar">{best.record.narrator || t('r.notMentioned')}</dd>
              </div>
              <div>
                <dt>{t('r.scholar')}</dt>
                <dd lang="ar">{best.record.scholar || t('r.notMentioned')}</dd>
              </div>
              <div>
                <dt>{t('r.source')}</dt>
                <dd lang="ar">{best.record.source || t('r.notMentioned')}</dd>
              </div>
              <div>
                <dt>{t('r.ref')}</dt>
                <dd>{best.record.reference || t('r.notMentioned')}</dd>
              </div>
            </dl>
            {best.record.takhrij ? (
              <>
                <h3 style={{ marginTop: 16 }}>{t('r.takhrij')}</h3>
                <p className="quote" style={{ fontSize: 18, margin: 0 }}>
                  {best.record.takhrij}
                </p>
              </>
            ) : null}
            <div className="actions">
              <a className="btn btn-ghost btn-small" href={best.record.source_url} target="_blank" rel="noopener noreferrer">
                {t('r.open')}
              </a>
            </div>
          </section>

          <section className="block meter" aria-labelledby="meter-title">
            <h3 id="meter-title" style={{ margin: 0 }}>
              {t('r.match', { pct })} {best.isPartOfSource ? t('r.partOf') : ''}
            </h3>
            <div className="meter-bar" role="img" aria-label={t('r.match', { pct })}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <small>{t('r.matchNote', { level: t(`level.${best.level}`) })}</small>
          </section>

          {diff && (diff.addedCount > 0 || diff.removedCount > 0) ? <DiffView diff={diff} /> : null}

          {result.otherRulings.length > 1 ? (
            <section className="block" aria-labelledby="rulings-title">
              <h3 id="rulings-title">{t('rulings.title')}</h3>
              <div className="table-wrap">
                <table className="rulings-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('rulings.scholar')}</th>
                      <th scope="col">{t('rulings.narrator')}</th>
                      <th scope="col">{t('rulings.source')}</th>
                      <th scope="col">{t('rulings.grade')}</th>
                    </tr>
                  </thead>
                  <tbody lang="ar">
                    {result.otherRulings.map((r, i) => (
                      <tr key={i}>
                        <td>{r.scholar}</td>
                        <td>{r.narrator || '—'}</td>
                        <td>
                          {r.source} {r.reference}
                        </td>
                        <td className={`tone-${gradeTone(r.grade)}`}>{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fine" style={{ marginBottom: 0 }}>
                {t('rulings.note')}
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      {needsHelp ? (
        <section className="next-steps" aria-labelledby="next-title">
          <h3 id="next-title">{t('next.title')}</h3>
          <p>
            {status === 'source_unavailable'
              ? t('next.unavailable')
              : status === 'needs_review'
                ? t('next.review')
                : t('next.notFound')}
          </p>
          <ol>
            {status !== 'source_unavailable' ? <li>{t('next.fix')}</li> : <li>{t('next.retry')}</li>}
            <li>{t('next.shorter')}</li>
            <li>{t('next.self')}</li>
          </ol>
          <div className="actions">
            {onEdit ? (
              <button className="btn btn-primary btn-small" onClick={onEdit}>
                {t('btn.edit')}
              </button>
            ) : null}
            {onRetry && status === 'source_unavailable' ? (
              <button className="btn btn-ghost btn-small" onClick={onRetry}>
                {t('btn.retry')}
              </button>
            ) : null}
            <a className="btn btn-ghost btn-small" href={result.searchUrl} target="_blank" rel="noopener noreferrer">
              {t('btn.searchSelf')}
            </a>
          </div>
        </section>
      ) : null}

      <EvidenceTrail steps={result.evidence} />

      {status !== 'source_unavailable' ? <ShareBox result={result} /> : null}

      <p className="fine">{t('result.disclaimer')}</p>
    </article>
  );
}
