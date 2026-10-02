'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PageHead from '../../components/PageHead';
import { clearHistory, readHistory, type HistoryEntry } from '../../lib/history.ts';
import { useI18n } from '../../lib/i18n/index.tsx';

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setItems(readHistory());
  }, []);

  const list = items ?? [];
  const found = list.filter((i) => i.status === 'verified_match' || i.status === 'wording_variant').length;
  const variants = list.filter((i) => i.status === 'wording_variant').length;

  return (
    <>
      <PageHead title={t('history.title')} sub={t('history.lede')} />
      <div className="page">
        <div className="container prose">
          <div className="stats">
            <div className="stat">
              <b>{list.length}</b>
              <span>{t('history.total')}</span>
            </div>
            <div className="stat">
              <b>{found}</b>
              <span>{t('history.found')}</span>
            </div>
            <div className="stat">
              <b>{variants}</b>
              <span>{t('history.variants')}</span>
            </div>
          </div>

          {items === null ? null : list.length === 0 ? (
            <p>
              {t('history.empty')} <Link href="/#verify">{t('history.start')}</Link>
            </p>
          ) : (
            <>
              {list.map((i) => (
                <div key={i.id} className="history-item">
                  <p lang="ar">{i.text}</p>
                  <small>
                    {t(`status.${i.status}`)}
                    {i.source ? ` — ${i.source}` : ''}
                    {i.grade ? ` — «${i.grade}»` : ''}
                    {' — '}
                    {new Date(i.at).toLocaleString(lang === 'ar' ? 'ar-SA' : lang)}
                  </small>
                  <Link href={`/result?lang=${lang}&q=${encodeURIComponent(i.text)}`} style={{ fontSize: 14 }}>
                    {t('history.recheck')}
                  </Link>
                </div>
              ))}
              <div className="actions">
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    clearHistory();
                    setItems([]);
                  }}
                >
                  {t('history.clear')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
