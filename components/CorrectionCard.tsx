'use client';

import { useState } from 'react';
import { buildCorrection, correctionShareText, type Correction } from '../lib/correction.ts';
import { gradeTone } from '../lib/grades.ts';
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

/** شعار بيّنة: مربع بنفسجي بحواف دائرية وبداخله نجمة ذهبية */
function logoMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.fillStyle = '#2e2452';
  ctx.beginPath();
  ctx.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.28);
  ctx.fill();
  ctx.strokeStyle = '#d4af5a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const s = size * 0.46;
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#e2c068';
  ctx.lineWidth = size * 0.055;
  ctx.lineJoin = 'round';
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function toneColor(grade: string): string {
  return gradeTone(grade) === 'weak' ? '#a3392b' : gradeTone(grade) === 'strong' ? '#006c35' : '#56439a';
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
      document.fonts.load('48px "Amiri Quran"'),
      document.fonts.load('700 48px Amiri'),
      document.fonts.load('800 80px "Noto Kufi Arabic"'),
      document.fonts.load('600 30px "IBM Plex Sans Arabic"'),
      document.fonts.load('600 30px "IBM Plex Sans"'),
    ]);
  } catch {
    /* نكمل بالخط الاحتياطي */
  }

  const saying = c.kind === 'saying';
  const quran = c.kind === 'quran' || c.kind === 'quran_variant';
  const warning = c.kind === 'weak' || c.kind === 'review' || c.kind === 'not_found' || c.kind === 'quran_missing' || c.misattributed;
  // خلفية خزامى فاتحة مع إطار ذهبي
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fbf9ff');
  g.addColorStop(1, '#ece5fb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = '#dcd2f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, W - 104, H - 104);
  for (const [x, y] of [[52, 52], [W - 52, 52], [52, H - 52], [W - 52, H - 52]]) star(ctx, x, y, 30, '#c9a24a');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const uiFont = dir === 'rtl' ? '"IBM Plex Sans Arabic", "Noto Naskh Arabic", sans-serif' : '"IBM Plex Sans", sans-serif';

  // الشعار: العلامة ثم الاسم
  logoMark(ctx, W / 2, 128, 86);
  ctx.direction = 'rtl';
  ctx.fillStyle = '#56439a';
  ctx.font = '800 62px "Noto Kufi Arabic", sans-serif';
  ctx.fillText('بيّنة', W / 2, 238);

  // شارة الحالة
  const badge =
    c.kind === 'quran_missing' ? t('card.quranMissing') : c.misattributed ? t('card.quranMis') : quran ? t('card.quran') :
    saying ? t('card.saying') : c.kind === 'not_found' ? t('card.notFound') : c.kind === 'weak' ? t('card.weak') : c.differ ? t('card.differ') : c.kind === 'review' ? t('card.review') : t('card.ok');
  ctx.direction = dir;
  ctx.font = `600 28px ${uiFont}`;
  const bw = Math.min(W - 160, ctx.measureText(badge).width + 64);
  ctx.fillStyle = saying ? '#f8f0dc' : warning ? '#fbeceb' : '#e4f2ea';
  ctx.beginPath();
  ctx.roundRect(W / 2 - bw / 2, 270, bw, 56, 28);
  ctx.fill();
  ctx.fillStyle = saying ? '#8a6416' : warning ? '#a3392b' : '#006c35';
  ctx.fillText(badge, W / 2, 308, W - 200);

  // التخطيط من الأسفل: التذييل ثم QR ثم صندوق الأحكام، وما بقي للنص
  const FOOT_Y = H - 92;
  const QR_SIZE = 124;
  const QR_TOP = FOOT_Y - 40 - QR_SIZE;
  const rulings = quran
    ? [{ grade: c.quranRef ?? '', scholar: t('card.mushaf'), source: '', reference: '' }]
    : saying
    ? c.citedRef
      ? [{ grade: c.citedRef, scholar: t('card.refNote'), source: '', reference: '' }]
      : []
    : c.rulings.slice(0, 3);
  const ROW = 92;
  const boxH = rulings.length ? 64 + rulings.length * ROW : 0;
  const boxBottom = QR_TOP - 28;
  const boxTop = boxBottom - boxH;
  const textTop = 372;
  const textBottom = (rulings.length ? boxTop : boxBottom) - 36;

  ctx.direction = 'rtl';
  let y = textTop;
  if (c.text) {
    if (!warning || saying || quran) {
      ctx.fillStyle = '#5b6360';
      ctx.font = '36px Amiri, serif';
      ctx.fillText(quran ? 'قال الله تعالى:' : saying ? (c.speaker ? `قال ${c.speaker}:` : '') : 'قال رسول الله ﷺ:', W / 2, y + 10, W - 220);
      y += 40;
    }
    ctx.fillStyle = '#18211d';
    let size = 54;
    let lines: string[] = [];
    let lh = 0;
    for (;;) {
      ctx.font = quran ? `${size}px "Amiri Quran", Amiri, serif` : `700 ${size}px Amiri, serif`;
      lines = wrap(ctx, quran ? `﴿${c.text}﴾` : `«${c.text}»`, W - 220);
      lh = size * (quran ? 2.1 : 1.8);
      if (lines.length * lh <= textBottom - y || size <= 26) break;
      size -= 2;
    }
    // توسيط النص عموديًا في المساحة المتاحة
    const block = lines.length * lh;
    y += Math.max(0, (textBottom - y - block) / 2) + size;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += lh;
    }
  } else {
    ctx.fillStyle = '#8a8697';
    ctx.font = '42px Amiri, serif';
    const lines = wrap(ctx, `«${originalText}»`, W - 240).slice(0, 5);
    y += 60;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      const w = Math.min(ctx.measureText(l).width, W - 240);
      ctx.strokeStyle = 'rgba(163,57,43,.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - w / 2, y - 14);
      ctx.lineTo(W / 2 + w / 2, y - 14);
      ctx.stroke();
      y += 80;
    }
  }

  // صندوق الأحكام: كل حكم منسوب لصاحبه
  if (rulings.length) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e3d3a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, boxTop, W - 200, boxH, 24);
    ctx.fill();
    ctx.stroke();
    ctx.direction = dir;
    ctx.fillStyle = '#5b6360';
    ctx.font = `500 24px ${uiFont}`;
    ctx.fillText(saying || quran ? t('share.source') : `${t('share.grade')} · ${t('share.source')}`, W / 2, boxTop + 42);
    ctx.direction = 'rtl';
    rulings.forEach((x, i) => {
      const ry = boxTop + 64 + i * ROW;
      if (i > 0) {
        ctx.strokeStyle = '#f0e8d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(160, ry);
        ctx.lineTo(W - 160, ry);
        ctx.stroke();
      }
      ctx.fillStyle = saying || quran ? '#56439a' : toneColor(x.grade);
      ctx.font = '700 38px Amiri, serif';
      ctx.fillText(quran ? `[${x.grade}]` : `«${x.grade}»`, W / 2, ry + 40, W - 260);
      ctx.fillStyle = '#18211d';
      ctx.font = '28px Amiri, serif';
      ctx.fillText([x.scholar, x.source, x.reference].filter(Boolean).join('، '), W / 2, ry + 78, W - 260);
    });
  }

  // QR في الزاوية، والتذييل في الوسط
  try {
    const mod = await import('qrcode');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR: any = (mod as any).default ?? mod;
    const data: string = await QR.toDataURL(qrUrl, { margin: 1, width: QR_SIZE, color: { dark: '#2e2452', light: '#ffffff' } });
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('qr'));
      img.src = data;
    });
    ctx.drawImage(img, W / 2 - QR_SIZE / 2, QR_TOP, QR_SIZE, QR_SIZE);
  } catch {
    /* نكمل دون QR */
  }
  ctx.direction = dir;
  ctx.fillStyle = '#56439a';
  ctx.font = `600 28px ${uiFont}`;
  ctx.fillText(t('card.footer'), W / 2, FOOT_Y, W - 200);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export default function CorrectionCard({ result }: { result: VerificationResult }) {
  const { t, dir, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = buildCorrection(result);
  if (c.kind === 'none') return null;

  const quranKind = c.kind === 'quran' || c.kind === 'quran_variant';
  const intro =
    c.partOfLonger
      ? t('fix.partWeak', { scholar: c.scholar ?? '', grade: c.grade ?? '' })
      : c.kind === 'quran'
      ? c.misattributed
        ? t('fix.quranMis')
        : t('fix.quran')
      : c.kind === 'saying'
      ? `${t('fix.saying', { who: c.speaker || t('exp.sayingSomeone') })}${c.citedRef ? ` ${t('exp.sayingRef', { ref: c.citedRef })}` : ''}`
      : c.kind === 'weak'
      ? t('fix.weak', { scholar: c.scholar ?? '', grade: c.grade ?? '' })
      : t(`fix.${c.kind}`);
  const warning =
    c.kind === 'weak' || c.kind === 'review' || c.kind === 'not_found' || c.kind === 'saying' || c.kind === 'quran_missing' || c.kind === 'quran_variant' || c.misattributed;
  const shareText = correctionShareText(c, {
    grade: t('share.grade'),
    source: t('share.source'),
    footer: t('card.footer'),
    warning: c.kind === 'quran_missing' ? t('card.quranMissing') : c.misattributed ? t('card.quranMis') : c.kind === 'saying' ? t('card.saying') : c.kind === 'not_found' ? t('card.notFound') : c.kind === 'weak' ? t('card.weak') : c.differ ? t('card.differ') : t('card.review'),
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
          {c.kind === 'saying' && c.speaker ? <p className="fine" style={{ margin: 0 }} lang="ar">قال {c.speaker}:</p> : null}
          {quranKind ? (
            <p className="quote quran-quote" lang="ar">
              ﴿{c.text}﴾
            </p>
          ) : (
            <p className="quote">«{c.text}»</p>
          )}
          {quranKind ? (
            <p className="fix-cite" lang="ar">
              {t('card.mushaf')}: [{c.quranRef}]
            </p>
          ) : c.kind === 'saying' ? (
            c.citedRef ? (
              <p className="fix-cite" lang="ar">
                {t('share.source')}: {c.citedRef}
              </p>
            ) : null
          ) : c.rulings.length ? (
            c.rulings.map((x, i) => (
              <p className="fix-cite" lang="ar" key={i}>
                <b>«{x.grade}»</b> — {[x.scholar, x.source, x.reference].filter(Boolean).join('، ')}
              </p>
            ))
          ) : (
            <p className="fix-cite" lang="ar">
              {[c.scholar, c.source, c.reference].filter(Boolean).join('، ')}
            </p>
          )}
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
      {c.text && !quranKind ? <p className="fine" style={{ marginBottom: 0 }}>{t('fix.note')}</p> : null}
    </section>
  );
}
