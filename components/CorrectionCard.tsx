'use client';

import { useState } from 'react';
import { buildCorrection, correctionShareText, type Correction } from '../lib/correction.ts';
import { useI18n, type T } from '../lib/i18n/index.tsx';
import type { VerificationResult } from '../lib/types.ts';

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.translate(cx, cy);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.restore();
}

async function drawCard(c: Correction, t: T, originalText: string, dir: 'rtl' | 'ltr', qrUrl: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    await Promise.all([
      document.fonts.load('48px Amiri'),
      document.fonts.load('700 48px Amiri'),
      document.fonts.load('800 80px "Noto Kufi Arabic"'),
      document.fonts.load('600 30px "IBM Plex Sans Arabic"'),
      document.fonts.load('600 30px "IBM Plex Sans"'),
    ]);
  } catch {
    /* نكمل بالخط الاحتياطي */
  }

  const warning = c.kind === 'weak' || c.kind === 'review' || c.kind === 'not_found';
  // خلفية خزامى فاتحة مع إطار
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f7f4fd');
  g.addColorStop(1, '#e9e1fb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c4b3ee';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = '#dcd2f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, W - 104, H - 104);
  for (const [x, y] of [[52, 52], [W - 52, 52], [52, H - 52], [W - 52, H - 52]]) star(ctx, x, y, 34, '#9c86da');

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const uiFont = dir === 'rtl' ? '"IBM Plex Sans Arabic", "Noto Naskh Arabic", sans-serif' : '"IBM Plex Sans", sans-serif';

  // الشعار
  ctx.fillStyle = '#56439a';
  ctx.font = '800 76px "Noto Kufi Arabic", sans-serif';
  ctx.fillText('بيّنة', W / 2, 168);

  // شارة الحالة
  const badge = c.kind === 'not_found' ? t('card.notFound') : c.kind === 'weak' ? t('card.weak') : c.kind === 'review' ? t('card.review') : t('card.ok');
  ctx.direction = dir;
  ctx.font = `600 30px ${uiFont}`;
  const bw = Math.min(W - 160, ctx.measureText(badge).width + 64);
  ctx.fillStyle = warning ? '#fbeceb' : '#e4f2ea';
  ctx.beginPath();
  ctx.roundRect(W / 2 - bw / 2, 214, bw, 62, 31);
  ctx.fill();
  ctx.fillStyle = warning ? '#a3392b' : '#006c35';
  ctx.fillText(badge, W / 2, 256, W - 200);

  // النص
  ctx.direction = 'rtl';
  let y = 380;
  if (c.text) {
    if (!warning) {
      ctx.fillStyle = '#5b6360';
      ctx.font = '40px Amiri, serif';
      ctx.fillText('قال رسول الله ﷺ:', W / 2, y);
      y += 30;
    }
    ctx.fillStyle = '#18211d';
    let size = 54;
    let lines: string[] = [];
    do {
      ctx.font = `700 ${size}px Amiri, serif`;
      lines = wrap(ctx, `«${c.text}»`, W - 220);
      size -= 4;
    } while (lines.length * size * 1.9 > 560 && size > 30);
    const lh = (size + 4) * 1.9;
    y += lh * 0.8;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += lh;
    }
  } else {
    ctx.fillStyle = '#8a8697';
    ctx.font = '44px Amiri, serif';
    const lines = wrap(ctx, `«${originalText}»`, W - 240).slice(0, 5);
    y += 40;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      const w = Math.min(ctx.measureText(l).width, W - 240);
      ctx.strokeStyle = 'rgba(163,57,43,.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - w / 2, y - 14);
      ctx.lineTo(W / 2 + w / 2, y - 14);
      ctx.stroke();
      y += 84;
    }
  }

  // الحكم والمصدر
  y = Math.max(y + 10, 940);
  if (c.grade || c.source) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dcd2f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(110, y, W - 220, 170, 24);
    ctx.fill();
    ctx.stroke();
    ctx.direction = dir;
    ctx.fillStyle = '#5b6360';
    ctx.font = `500 26px ${uiFont}`;
    ctx.fillText(`${t('share.grade')} · ${t('share.source')}`, W / 2, y + 46);
    ctx.direction = 'rtl';
    ctx.fillStyle = warning ? '#a3392b' : '#006c35';
    ctx.font = '700 44px Amiri, serif';
    ctx.fillText(c.grade ? `«${c.grade}»` : '', W / 2, y + 102, W - 260);
    ctx.fillStyle = '#18211d';
    ctx.font = '32px Amiri, serif';
    ctx.fillText([c.scholar, c.source, c.reference].filter(Boolean).join('، '), W / 2, y + 148, W - 260);
  }

  // QR والتذييل
  try {
    const mod = await import('qrcode');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR: any = (mod as any).default ?? mod;
    const data: string = await QR.toDataURL(qrUrl, { margin: 1, width: 150, color: { dark: '#2e2452', light: '#ffffff' } });
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('qr'));
      img.src = data;
    });
    ctx.drawImage(img, W / 2 - 75, H - 290, 150, 150);
  } catch {
    /* نكمل دون QR */
  }
  ctx.direction = dir;
  ctx.fillStyle = '#56439a';
  ctx.font = `600 28px ${uiFont}`;
  ctx.fillText(t('card.footer'), W / 2, H - 96, W - 200);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export default function CorrectionCard({ result }: { result: VerificationResult }) {
  const { t, dir, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = buildCorrection(result);
  if (c.kind === 'none') return null;

  const intro =
    c.kind === 'weak'
      ? t('fix.weak', { scholar: c.scholar ?? '', grade: c.grade ?? '' })
      : t(`fix.${c.kind}`);
  const warning = c.kind === 'weak' || c.kind === 'review' || c.kind === 'not_found';
  const shareText = correctionShareText(c, {
    grade: t('share.grade'),
    source: t('share.source'),
    footer: t('card.footer'),
    warning: c.kind === 'not_found' ? t('card.notFound') : c.kind === 'weak' ? t('card.weak') : t('card.review'),
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const url = `${window.location.origin}/result?lang=${lang}&q=${encodeURIComponent(result.extraction.originalText.slice(0, 600))}`;
      const blob = await drawCard(c, t, result.extraction.searchText, dir, url);
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bayyinah-card.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`fix ${warning ? 'fix-warn' : 'fix-ok'}`} aria-labelledby="fix-title">
      <h3 id="fix-title">{t('fix.title')}</h3>
      <p className="fix-intro">{intro}</p>
      {c.text ? (
        <div className="fix-text">
          <p className="quote">«{c.text}»</p>
          <p className="fix-cite" lang="ar">
            {c.grade ? <b>«{c.grade}»</b> : null}
            {c.grade ? ' — ' : ''}
            {[c.scholar, c.source, c.reference].filter(Boolean).join('، ')}
          </p>
        </div>
      ) : null}
      {c.removedExtras.length && c.text ? (
        <p className="fine" style={{ margin: '8px 0 0' }}>
          {t('fix.removed', { list: c.removedExtras.map((e) => `«${e}»`).join('، ') })}
        </p>
      ) : null}
      <div className="actions">
        <button className="btn btn-primary btn-small" onClick={download} disabled={busy}>
          {t('fix.download')}
        </button>
        <button className="btn btn-ghost btn-small" onClick={copy} aria-live="polite">
          {copied ? t('fix.copied') : t('fix.copy')}
        </button>
      </div>
      {c.text ? <p className="fine" style={{ marginBottom: 0 }}>{t('fix.note')}</p> : null}
    </section>
  );
}
