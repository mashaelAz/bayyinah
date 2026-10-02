'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Star } from './Ornament';
import { LANGS, useI18n, type Lang } from '../lib/i18n/index.tsx';

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/#problem', label: t('nav.problem') },
    { href: '/#solution', label: t('nav.solution') },
    { href: '/#how', label: t('nav.how') },
    { href: '/#verify', label: t('nav.verify') },
    { href: '/#standards', label: t('nav.standards') },
    { href: '/#sources', label: t('nav.sources') },
    { href: '/history', label: t('nav.history') },
  ];
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label={t('brand')}>
          <span className="brand-mark" aria-hidden="true">
            <Star color="#d4af5a" />
          </span>
          {t('brand')}
        </Link>
        <nav id="nav-links" className={`nav-links${open ? ' open' : ''}`} aria-label={t('nav.menu')}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-tools">
          <label className="sr-only" htmlFor="lang-select">
            {t('nav.lang')}
          </label>
          <select
            id="lang-select"
            className="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <Link href="/#verify" className="btn btn-primary btn-small nav-cta">
            {t('nav.cta')}
          </Link>
          <button className="nav-toggle" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((v) => !v)}>
            {t('nav.menu')}
          </button>
        </div>
      </div>
    </header>
  );
}
