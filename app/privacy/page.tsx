'use client';

import PageHead from '../../components/PageHead';
import { useI18n } from '../../lib/i18n/index.tsx';

export default function PrivacyPage() {
  const { t } = useI18n();
  const parts = ['images', 'text', 'history', 'never'] as const;
  return (
    <>
      <PageHead title={t('privacy.title')} sub={t('privacy.intro')} />
      <div className="page">
        <div className="container prose">
          {parts.map((p) => (
            <section key={p}>
              <h2>{t(`privacy.${p}.t`)}</h2>
              <p>{t(`privacy.${p}.b`)}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
