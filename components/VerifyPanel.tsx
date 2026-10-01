'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VerificationResult } from '../lib/types.ts';
import { ocrService } from '../lib/ocr/ocrService.ts';
import { saveToHistory } from '../lib/history.ts';
import ResultCard from './ResultCard';

type Tab = 'image' | 'text';
type Phase = 'idle' | 'ocr' | 'review' | 'verifying' | 'done';

const ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const OCR_STEPS = ['جاري قراءة الصورة…', 'جاري استخراج النص…'];
const VERIFY_STEPS = ['جاري تحديد العبارة…', 'جاري البحث في المصادر…', 'جاري مقارنة النتائج…'];

export const EXAMPLES = [
  {
    title: 'حديث بلفظ موثق',
    text: 'قال رسول الله ﷺ: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
    note: 'لفظ موجود في المصدر كما هو',
  },
  {
    title: 'نص باختلاف في اللفظ',
    text: 'قال رسول الله ﷺ: «إنما الأعمال بالنية، وإنما لكل إنسان ما نوى، فمن صدقت نيته بلغ مراده»\nانشر تؤجر\nلا تجعلها تقف عندك',
    note: 'نص اختبار محرّف عمدًا، مع عبارات دعوية إضافية',
  },
  {
    title: 'عبارة بلا تطابق واضح',
    text: 'من جد وجد ومن زرع حصد',
    note: 'مثل عربي، لا يُتوقع وجوده في المصادر الحديثية',
  },
];

interface Props {
  autoText?: string;
}

export default function VerifyPanel({ autoText }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState('');
  const [fromImage, setFromImage] = useState(false);
  const [drag, setDrag] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  // أزرار البطل: #verify-image و #verify-text
  useEffect(() => {
    const apply = () => {
      if (window.location.hash === '#verify-image') setTab('image');
      if (window.location.hash === '#verify-text') setTab('text');
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const runVerify = useCallback(async (value: string, opts: { fromImage: boolean; extractedText: string }) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('أدخل نصًا للتحقق منه.');
      return;
    }
    setError(null);
    setResult(null);
    setPhase('verifying');
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, VERIFY_STEPS.length - 1)), 700);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, extractedText: opts.extractedText, fromImage: opts.fromImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'تعذر الوصول إلى مصدر التحقق حاليًا. لم نصدر نتيجة غير موثقة.');
      setResult(data as VerificationResult);
      saveToHistory(data as VerificationResult);
      setPhase('done');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setError((e as Error).message || 'تعذر الوصول إلى مصدر التحقق حاليًا. لم نصدر نتيجة غير موثقة.');
      setPhase(opts.fromImage ? 'review' : 'idle');
    } finally {
      clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    if (autoText && !autoRan.current) {
      autoRan.current = true;
      setText(autoText);
      runVerify(autoText, { fromImage: false, extractedText: '' });
    }
  }, [autoText, runVerify]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) {
      setError('صيغة غير مدعومة. استخدم صورة PNG أو JPG أو JPEG أو WEBP.');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError('حجم الصورة أكبر من 8 ميغابايت. جرّب لقطة شاشة أصغر.');
      return;
    }
    setError(null);
    setResult(null);
    setPhase('idle');
    setExtracted('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function runOcr() {
    if (!file) return;
    setError(null);
    setPhase('ocr');
    setStepIndex(0);
    setOcrProgress(0);
    try {
      const out = await ocrService.recognize(file, (p) => {
        if (p.status.includes('recogniz')) {
          setStepIndex(1);
          setOcrProgress(Math.round(p.progress * 100));
        }
      });
      if (!out.trim()) throw new Error('empty');
      setExtracted(out);
      setText(out);
      setFromImage(true);
      setPhase('review');
    } catch {
      setPhase('review');
      setExtracted('');
      setText('');
      setFromImage(true);
      setError('لم نتمكن من قراءة النص بوضوح. يمكنك كتابة النص يدويًا أدناه أو تجربة صورة أوضح.');
    }
  }

  function applyExample(t: string) {
    setTab('text');
    setText(t);
    setFromImage(false);
    setResult(null);
    setPhase('idle');
    setError(null);
  }

  function resetAll() {
    setPhase('idle');
    setResult(null);
    setError(null);
    setFile(null);
    setPreview(null);
    setExtracted('');
    setText('');
    setFromImage(false);
  }

  const busy = phase === 'ocr' || phase === 'verifying';

  return (
    <div className="verify" id="verify">
      <div className="tabs" role="tablist" aria-label="طريقة الإدخال">
        <button
          role="tab"
          className="tab"
          aria-selected={tab === 'image'}
          onClick={() => setTab('image')}
          disabled={busy}
        >
          رفع صورة
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={tab === 'text'}
          onClick={() => setTab('text')}
          disabled={busy}
        >
          كتابة النص
        </button>
      </div>

      {tab === 'image' ? (
        <div role="tabpanel">
          {!preview ? (
            <label
              className={`dropzone${drag ? ' drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <strong>اسحب البطاقة هنا أو اختر صورة من جهازك</strong>
              <small>يدعم PNG وJPG وJPEG وWEBP</small>
              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="معاينة البطاقة المرفوعة" />
              <div style={{ flex: 1, minWidth: 220 }}>
                {phase === 'idle' ? (
                  <div className="actions" style={{ marginTop: 0 }}>
                    <button className="btn btn-primary" onClick={runOcr}>
                      استخراج النص
                    </button>
                    <button className="btn btn-ghost" onClick={resetAll}>
                      اختيار صورة أخرى
                    </button>
                  </div>
                ) : null}
                {phase === 'ocr' ? (
                  <div className="loading" aria-live="polite">
                    {OCR_STEPS.map((s, i) => (
                      <div key={s} className={`loading-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}>
                        <span className="dot" />
                        {s}
                        {i === 1 && stepIndex === 1 ? ` ${ocrProgress}%` : ''}
                      </div>
                    ))}
                    <p className="fine">أول مرة قد تستغرق وقتًا أطول لتحميل نموذج قراءة العربية.</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <p className="field-hint">تستخدم الصورة لغرض استخراج النص والتحقق فقط، وتُقرأ داخل متصفحك دون رفعها أو حفظها.</p>

          {phase === 'review' || (fromImage && (phase === 'verifying' || phase === 'done')) ? (
            <div style={{ marginTop: 18 }}>
              <label className="field-label" htmlFor="ocr-text">
                النص المستخرج
              </label>
              <textarea
                id="ocr-text"
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                placeholder="اكتب النص كما في البطاقة…"
              />
              <p className="field-hint">راجع النص وصحّح أي خطأ في القراءة قبل التحقق.</p>
              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={busy || !text.trim()}
                  onClick={() => runVerify(text, { fromImage: true, extractedText: extracted })}
                >
                  متابعة التحقق
                </button>
                <button className="btn btn-ghost" onClick={resetAll} disabled={busy}>
                  بدء من جديد
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel">
          <label className="field-label" htmlFor="input-text">
            النص المراد التحقق منه
          </label>
          <textarea
            id="input-text"
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder="الصق الحديث أو العبارة التي تريد التحقق منها هنا…"
          />
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy || !text.trim()}
              onClick={() => runVerify(text, { fromImage: false, extractedText: '' })}
            >
              تحقق الآن
            </button>
            {text ? (
              <button className="btn btn-ghost" onClick={resetAll} disabled={busy}>
                مسح
              </button>
            ) : null}
          </div>

          {phase !== 'done' && !busy ? (
            <>
              <h3 style={{ margin: '26px 0 0', fontSize: 17 }}>جرّب مثالًا</h3>
              <div className="examples">
                {EXAMPLES.map((ex) => (
                  <button key={ex.title} className="example" onClick={() => applyExample(ex.text)}>
                    <b>{ex.title}</b>
                    <span>{ex.text.split('\n')[0]}</span>
                    <small>{ex.note}</small>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {phase === 'verifying' ? (
        <div className="loading" aria-live="polite">
          {VERIFY_STEPS.map((s, i) => (
            <div key={s} className={`loading-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}>
              <span className="dot" />
              {s}
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <div ref={resultRef}>{result ? <ResultCard result={result} /> : null}</div>
    </div>
  );
}
