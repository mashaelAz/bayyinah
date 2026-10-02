'use client';

import PageHead from './PageHead';
import VerifyPanel from './VerifyPanel';
import { useI18n } from '../lib/i18n/index.tsx';

export default function ResultView({ q }: { q: string }) {
  const { t } = useI18n();
  return (
    <>
      <PageHead title={t('result.title')} sub={q ? t('result.recheck') : t('result.empty')} />
      <div className="page">
        <div className="container">
          <VerifyPanel autoText={q || undefined} />
        </div>
      </div>
    </>
  );
}
