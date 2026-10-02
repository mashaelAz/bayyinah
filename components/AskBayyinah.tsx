'use client';

import { useEffect, useState } from 'react';
import { translate, useI18n } from '../lib/i18n/index.tsx';
import type { VerificationResult } from '../lib/types.ts';

/** بيانات النتيجة التي يُسمح للمساعد بالاعتماد عليها (الاسترجاع قبل التوليد) */
function buildContext(r: VerificationResult): string {
  const lines: string[] = [];
  lines.push(`النص الذي أدخله المستخدم: «${r.extraction.searchText}»`);
  if (r.extraction.extraPhrases.length) lines.push(`عبارات مكتوبة على البطاقة وليست من المصدر (لا يُعتمد عليها): ${r.extraction.extraPhrases.join(' | ')}`);
  lines.push(`نوع النص المقدّر: ${r.extraction.contentType}${r.extraction.speaker ? ` (منسوب إلى ${r.extraction.speaker})` : ''}`);
  if (r.extraction.citedRef) lines.push(`المرجع المكتوب على البطاقة: ${r.extraction.citedRef}`);
  lines.push(`نتيجة التحقق: ${translate('ar', `status.${r.status}`)}`);
  if (r.best) {
    const b = r.best.record;
    lines.push(`أقرب نص في المصدر: «${b.text}»`);
    lines.push(`المحدّث: ${b.scholar || '-'} | الكتاب: ${b.source || '-'} | الرقم: ${b.reference || '-'} | الراوي: ${b.narrator || '-'}`);
    lines.push(`حكم المحدّث كما ورد: ${b.grade || 'لم يرد حكم'}`);
    lines.push(`نسبة التشابه بين نص المستخدم ونص المصدر: ${Math.round(r.best.similarity * 100)}%`);
  }
  if (r.otherRulings.length > 1) {
    lines.push('أحكام المحدثين على الروايات المطابقة:');
    for (const x of r.otherRulings.slice(0, 8)) lines.push(`- ${x.scholar} (${x.source} ${x.reference}): ${x.grade}`);
  }
  lines.push(`مصدر البيانات: ${r.provider.live ? 'الدرر السنية مباشرة' : 'نصوص الصحيحين أو نسخة مخزنة من الدرر'}`);
  return lines.join('\n');
}

/** إزالة رموز التنسيق إن ظهرت في الجواب */
function clean(t: string): string {
  return t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ').replace(/^#+\s*/gm, '').trim();
}

export default function AskBayyinah({ result }: { result: VerificationResult }) {
  const { t, lang } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);

  useEffect(() => {
    fetch('/api/ask', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setEnabled(Boolean(b?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setFail(false);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: text, context: buildContext(result), history: chat, lang }),
      });
      const body = res.ok ? await res.json() : null;
      if (!body?.answer) throw new Error('no_answer');
      setChat((c) => [...c, { q: text, a: body.answer }]);
      setQ('');
    } catch {
      setFail(true);
    }
    setBusy(false);
  }

  const suggestions = [t('ask.q1'), t('ask.q2'), t('ask.q3')];

  return (
    <section className="block ask" aria-labelledby="ask-title">
      <h3 id="ask-title">{t('ask.title')}</h3>
      <p className="fine" style={{ marginTop: 0 }}>{t('ask.intro')}</p>
      <div className="ask-chips">
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => ask(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
      {chat.map((m, i) => (
        <div key={i} className="ask-pair">
          <p className="ask-q">{m.q}</p>
          <p className="ask-a">{clean(m.a)}</p>
        </div>
      ))}
      {busy ? <p className="fine">{t('ask.thinking')}</p> : null}
      {fail ? <div className="alert alert-warn">{t('ask.fail')}</div> : null}
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ask.placeholder')} disabled={busy} />
        <button className="btn btn-primary btn-small" type="submit" disabled={busy || !q.trim()}>
          {t('ask.send')}
        </button>
      </form>
      <p className="fine" style={{ marginBottom: 0 }}>{t('ask.note')}</p>
    </section>
  );
}
