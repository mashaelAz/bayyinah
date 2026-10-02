'use client';

import { useState } from 'react';
import { dorarApiUrl, parsePastedDorar, saveCollected } from '../lib/providers/manual.ts';
import { toSourceQuery } from '../lib/verify.ts';
import { useI18n } from '../lib/i18n/index.tsx';
import type { SourceRecord } from '../lib/types.ts';

/**
 * «جسر الدرر»: إذا رفض المصدر طلبات الموقع، يفتح المستخدم نتيجة الدرر بنفسه وينسخها،
 * فيكمل الموقع التحقق من البيانات المنسوخة. لا التفاف على حماية المصدر؛ المستخدم هو من يفتح الصفحة.
 */
export default function DorarBridge({ text, onRecords }: { text: string; onRecords: (records: SourceRecord[], query: string) => void }) {
  const { t } = useI18n();
  const [paste, setPaste] = useState('');
  const [err, setErr] = useState(false);
  const query = toSourceQuery(text).split(/\s+/).slice(0, 7).join(' ');

  function run() {
    try {
      const records = parsePastedDorar(paste, query);
      setErr(false);
      saveCollected(records);
      onRecords(records, query);
    } catch {
      setErr(true);
    }
  }

  return (
    <section className="block bridge" aria-labelledby="bridge-title">
      <h3 id="bridge-title">{t('bridge.title')}</h3>
      <p>{t('bridge.intro')}</p>
      <ol className="bridge-steps">
        <li>
          {t('bridge.step1')}{' '}
          <a className="btn btn-primary btn-small" href={dorarApiUrl(query)} target="_blank" rel="noopener noreferrer">
            {t('bridge.open')}
          </a>
        </li>
        <li>{t('bridge.step2')}</li>
        <li>{t('bridge.step3')}</li>
      </ol>
      <textarea
        className="input"
        dir="ltr"
        style={{ minHeight: 110, fontSize: 13 }}
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={t('bridge.placeholder')}
      />
      {err ? (
        <div className="alert alert-warn" role="status">
          {t('bridge.error')}
        </div>
      ) : null}
      <div className="actions">
        <button className="btn btn-primary" onClick={run} disabled={!paste.trim()}>
          {t('bridge.run')}
        </button>
      </div>
    </section>
  );
}
