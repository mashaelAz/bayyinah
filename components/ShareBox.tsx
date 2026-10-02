'use client';

import { useEffect, useState } from 'react';
import type { VerificationResult } from '../lib/types.ts';
import { useI18n } from '../lib/i18n/index.tsx';

export default function ShareBox({ result }: { result: VerificationResult }) {
  const { t, lang } = useI18n();
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = `${window.location.origin}/result?lang=${lang}&q=${encodeURIComponent(result.extraction.originalText.slice(0, 600))}`;
    setUrl(u);
    import('qrcode')
      .then((mod) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const QR: any = (mod as any).default ?? mod;
        return QR.toDataURL(u, { margin: 1, width: 224, color: { dark: '#0a3d23', light: '#ffffff' } }) as Promise<string>;
      })
      .then(setQr)
      .catch(() => setQr(''));
  }, [result, lang]);

  const grade = result.best?.record.grade;
  const shareText = [
    result.extraction.searchText.slice(0, 120),
    result.best ? `${t('share.source')}: ${result.best.record.scholar}، ${result.best.record.source}` : null,
    grade ? `${t('share.grade')}: ${grade}` : null,
    t('share.via'),
  ]
    .filter(Boolean)
    .join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('share.via'), text: shareText, url });
      } catch {
        /* أغلق المستخدم نافذة المشاركة */
      }
    } else {
      copy();
    }
  }

  return (
    <section className="block" aria-labelledby="share-title">
      <h3 id="share-title">{t('share.title')}</h3>
      <div className="share">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr ? <img src={qr} alt={t('share.qrAlt')} /> : null}
        <div>
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn btn-primary btn-small" onClick={share}>
              {t('share.btn')}
            </button>
            <button className="btn btn-ghost btn-small" onClick={copy} aria-live="polite">
              {copied ? t('share.copied') : t('share.copy')}
            </button>
          </div>
          <p className="fine" style={{ marginBottom: 0 }}>
            {t('share.note')}
          </p>
        </div>
      </div>
    </section>
  );
}
