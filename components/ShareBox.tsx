'use client';

import { useEffect, useState } from 'react';
import type { VerificationResult } from '../lib/types.ts';

export default function ShareBox({ result }: { result: VerificationResult }) {
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = `${window.location.origin}/result?q=${encodeURIComponent(result.extraction.originalText.slice(0, 600))}`;
    setUrl(u);
    import('qrcode')
      .then((mod) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const QR: any = (mod as any).default ?? mod;
        return QR.toDataURL(u, { margin: 1, width: 224, color: { dark: '#123a2f', light: '#ffffff' } }) as Promise<string>;
      })
      .then(setQr)
      .catch(() => setQr(''));
  }, [result]);

  const grade = result.best?.record.grade;
  const shareText = [
    result.extraction.searchText.slice(0, 120),
    result.best ? `المصدر: ${result.best.record.scholar}، ${result.best.record.source}` : null,
    grade ? `حكم المحدّث: ${grade}` : null,
    'تحقق عبر تثبّت',
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
        await navigator.share({ title: 'نتيجة التحقق — تثبّت', text: shareText, url });
      } catch {
        /* أغلق المستخدم نافذة المشاركة */
      }
    } else {
      copy();
    }
  }

  return (
    <section className="block" aria-labelledby="share-title">
      <h3 id="share-title">مشاركة نتيجة التحقق</h3>
      <div className="share">
        {qr ? <img src={qr} alt="رمز QR يفتح صفحة نتيجة التحقق" /> : null}
        <div>
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn btn-primary btn-small" onClick={share}>
              مشاركة النتيجة
            </button>
            <button className="btn btn-ghost btn-small" onClick={copy} aria-live="polite">
              {copied ? 'نُسخ الرابط' : 'نسخ الرابط'}
            </button>
          </div>
          <p className="fine" style={{ marginBottom: 0 }}>
            الرابط يعيد التحقق من المصدر عند فتحه، ولا يحتوي أي حكم من الذكاء الاصطناعي.
          </p>
        </div>
      </div>
    </section>
  );
}
