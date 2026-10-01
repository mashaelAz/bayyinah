'use client';

import Link from 'next/link';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/verify', label: 'تحقق الآن' },
  { href: '/how', label: 'كيف نتحقق؟' },
  { href: '/sources', label: 'المصادر' },
  { href: '/history', label: 'آخر عمليات التحقق' },
  { href: '/about', label: 'عن تثبّت' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="تثبّت — الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          تثبّت
        </Link>
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          القائمة
        </button>
        <nav id="nav-links" className={`nav-links${open ? ' open' : ''}`} aria-label="التنقل الرئيسي">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/verify" className="btn btn-primary btn-small nav-cta">
          ابدأ التحقق
        </Link>
      </div>
    </header>
  );
}
