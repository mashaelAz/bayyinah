'use client';

import Link from 'next/link';
import { useI18n } from '../lib/i18n/index.tsx';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">بيّنة</div>
            <p style={{ margin: '2px 0 0' }}>{t('brand.tagline')}</p>
          </div>
          <nav className="footer-links" aria-label={t('nav.menu')}>
            <Link href="/#sources">{t('footer.sources')}</Link>
            <Link href="/#standards">{t('footer.standards')}</Link>
            <Link href="/history">{t('footer.history')}</Link>
            <Link href="/privacy">{t('footer.privacy')}</Link>
          </nav>
        </div>
        <p className="disclaimer">{t('footer.disclaimer')}</p>
        <p className="disclaimer" style={{ marginTop: 6 }}>
          {t('footer.hackathon')} {t('sources.independent')}
        </p>
      </div>
    </footer>
  );
}
