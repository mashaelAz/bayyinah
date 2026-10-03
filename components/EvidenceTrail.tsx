'use client';

import type { EvidenceStep, MatchLevel } from '../lib/types.ts';
import { useI18n, type T } from '../lib/i18n/index.tsx';
import type { MessageKey } from '../lib/i18n/ar.ts';

function providerName(t: T, id: unknown): string {
  const key = `provider.${String(id)}` as MessageKey;
  const out = t(key);
  return out === key ? String(id) : out;
}

function describe(t: T, s: EvidenceStep): { label: string; detail?: string } {
  const p = s.params ?? {};
  switch (s.code) {
    case 'ocr_done':
      return { label: t('ev.ocr_done'), detail: t('ev.ocr_done.d') };
    case 'normalized':
      return { label: t('ev.normalized'), detail: t('ev.normalized.d') };
    case 'phrase_identified': {
      const parts = [
        p.attribution ? `${t('ev.phrase.attr')}: «${p.attribution}»` : null,
        Number(p.extras) > 0 ? t('ev.phrase.extras', { n: Number(p.extras) }) : null,
        p.ai ? t('ev.phrase.ai') : t('ev.phrase.rules'),
      ].filter(Boolean);
      return { label: t('ev.phrase_identified'), detail: parts.join('، ') };
    }
    case 'provider_failed':
      return {
        label: t('ev.provider_failed', { provider: providerName(t, p.provider) }),
        detail: t('ev.reason', { reason: String(p.reason) }),
      };
    case 'searched':
      return {
        label: t('ev.searched', { provider: providerName(t, p.provider) }),
        detail: t('ev.searched.d', { query: String(p.query) }),
      };
    case 'found':
      return { label: t('ev.found', { count: Number(p.count) }) };
    case 'best_match':
      return {
        label: t('ev.best_match'),
        detail: t('ev.best_match.d', { level: t(`level.${p.level as MatchLevel}`), pct: Number(p.pct) }),
      };
    case 'grade_quoted':
      return {
        label: t('ev.grade_quoted'),
        detail: t('ev.grade_quoted.d', {
          grade: String(p.grade),
          scholar: String(p.scholar),
          source: String(p.source),
          ref: String(p.ref),
        }),
      };
    case 'no_grade':
      return { label: t('ev.no_grade') };
    case 'unavailable':
      return { label: t('ev.unavailable'), detail: p.reason ? t('ev.reason', { reason: String(p.reason) }) : undefined };
    case 'nothing_to_search':
      return { label: t('ev.nothing_to_search') };
    case 'not_hadith':
      return { label: t('ev.not_hadith') };
    case 'six_books':
      return { label: t('ev.six_books') };
    case 'quran_found':
      return { label: t('ev.quran_found', { surah: String(p.surah), ayah: String(p.ayah) }) };
    case 'quran_missing':
      return { label: t('ev.quran_missing') };
  }
}

export default function EvidenceTrail({ steps }: { steps: EvidenceStep[] }) {
  const { t } = useI18n();
  return (
    <section className="block" aria-labelledby="trail-title">
      <h3 id="trail-title">{t('trail.title')}</h3>
      <ol className="trail">
        {steps.map((s, i) => {
          const d = describe(t, s);
          return (
            <li key={i}>
              <div>
                {d.label}
                {d.detail ? <small>{d.detail}</small> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
