'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtractionResult, VerificationResult } from '../lib/types.ts';
import { aiOcr, aiOcrAvailable, ocrService } from '../lib/ocr/ocrService.ts';
import { saveToHistory } from '../lib/history.ts';
import { verifyText } from '../lib/verify.ts';
import { browserProviders } from '../lib/providers/index.ts';
import { demoRecords } from '../lib/providers/demoData.ts';
import { useI18n } from '../lib/i18n/index.tsx';
import { IconSpark } from './Icons';
import ResultCard from './ResultCard';

type Tab = 'image' | 'text';
type Phase = 'idle' | 'ocr' | 'review' | 'verifying' | 'done';

const ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/** نصوص الأمثلة عربية في كل اللغات؛ هي ما يُتحقق منه */
export const EXAMPLES = [
  { key: 1 as const, text: 'قال رسول الله ﷺ: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى' },
  {
    key: 2 as const,
    text: 'قال رسول الله ﷺ: «إنما الأعمال بالنية، وإنما لكل إنسان ما نوى، فمن صدقت نيته بلغ مراده»\nانشر تؤجر\nلا تجعلها تقف عندك',
  },
  { key: 3 as const, text: 'من جد وجد ومن زرع حصد' },
];

/** المساعد اللغوي الاختياري عبر خادم بيّنة؛ إن لم يكن مفعّلًا يكمل التحقق بالقواعد */
async function assistViaServer(base: ExtractionResult): Promise<ExtractionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('/api/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: base.originalText, extractedText: base.extractedText }),
      signal: controller.signal,
    });
    if (res.status !== 200) return base;
    const body = await res.json();
    return body?.extraction?.searchText ? (body.extraction as ExtractionResult) : base;
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}

export default function VerifyPanel({ autoText }: { autoText?: string }) {
  const { t } = useI18n();
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
  const [ocrQuality, setOcrQuality] = useState<number | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [lastOpts, setLastOpts] = useState({ fromImage: false, extractedText: '' });
  const resultRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const autoRan = useRef(false);

  // هل القراءة بالذكاء الاصطناعي متاحة في هذا النشر؟
  useEffect(() => {
    aiOcrAvailable().then(setAiReady);
  }, []);

  async function runAiOcr() {
    if (!file) return;
    setAiBusy(true);
    setAiError(false);
    try {
      const out = await aiOcr(file);
      setOcrQuality(out.quality);
      setExtracted(out.text);
      setText(out.text);
      setAiUsed(true);
      setError(null);
    } catch {
      setAiError(true);
    }
    setAiBusy(false);
  }

  // أزرار الواجهة: #verify-image و #verify-text
  useEffect(() => {
    const apply = () => {
      if (window.location.hash === '#verify-image') setTab('image');
      if (window.location.hash === '#verify-text') {
        setTab('text');
        setTimeout(() => textRef.current?.focus(), 300);
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const runVerify = useCallback(
    async (value: string, opts: { fromImage: boolean; extractedText: string }) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setError(t('err.empty'));
        return;
      }
      setError(null);
      setResult(null);
      setLastOpts(opts);
      setPhase('verifying');
      setStepIndex(0);
      const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, 2)), 700);
      try {
        const r = await verifyText(
          { text: trimmed.slice(0, 2000), extractedText: opts.extractedText, fromImage: opts.fromImage },
          { providers: browserProviders(demoRecords), assist: assistViaServer },
        );
        setResult(r);
        saveToHistory(r);
        setPhase('done');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      } catch {
        setError(t('err.generic'));
        setPhase(opts.fromImage ? 'review' : 'idle');
      } finally {
        clearInterval(timer);
      }
    },
    [t],
  );

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
      setError(t('err.format'));
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError(t('err.size'));
      return;
    }
    setError(null);
    setResult(null);
    setPhase('idle');
    setExtracted('');
    setOcrQuality(null);
    setAiUsed(false);
    setAiError(false);
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
      if (!out.text.trim()) throw new Error('empty');
      setOcrQuality(out.quality);
      setExtracted(out.text);
      setText(out.text);
    } catch {
      setExtracted('');
      setText('');
      setOcrQuality(0);
      setError(t('err.ocr'));
    }
    setFromImage(true);
    setPhase('review');
  }

  function applyExample(v: string) {
    setTab('text');
    setText(v);
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
    setOcrQuality(null);
    setAiUsed(false);
    setAiError(false);
    setFromImage(false);
  }

  const busy = phase === 'ocr' || phase === 'verifying';
  const ocrSteps = [t('ocr.reading'), t('ocr.extracting')];
  const verifySteps = [t('step.identify'), t('step.search'), t('step.compare')];
  const showReview = phase === 'review' || (fromImage && (phase === 'verifying' || phase === 'done'));

  return (
    <div className="verify">
      <div className="ai-note">
        <IconSpark />
        {t('verify.ai')}
      </div>

      <div className="tabs" role="tablist" aria-label={t('tabs.aria')}>
        <button role="tab" className="tab" aria-selected={tab === 'image'} onClick={() => setTab('image')} disabled={busy}>
          {t('tabs.image')}
        </button>
        <button role="tab" className="tab" aria-selected={tab === 'text'} onClick={() => setTab('text')} disabled={busy}>
          {t('tabs.text')}
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
              <strong>{t('drop.title')}</strong>
              <small>{t('drop.formats')}</small>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={t('img.alt')} />
              <div style={{ flex: 1, minWidth: 220 }}>
                {phase === 'idle' ? (
                  <div className="actions" style={{ marginTop: 0 }}>
                    <button className="btn btn-primary" onClick={runOcr}>
                      {t('btn.extract')}
                    </button>
                    <button className="btn btn-ghost" onClick={resetAll}>
                      {t('btn.otherImage')}
                    </button>
                  </div>
                ) : null}
                {phase === 'ocr' ? (
                  <div className="loading" aria-live="polite">
                    {ocrSteps.map((s, i) => (
                      <div key={s} className={`loading-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}>
                        <span className="dot" />
                        {s}
                        {i === 1 && stepIndex === 1 ? ` ${ocrProgress}%` : ''}
                      </div>
                    ))}
                    <p className="fine">{t('ocr.firstTime')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <p className="field-hint">{t('privacy.image')}</p>

          {showReview ? (
            <div style={{ marginTop: 18 }}>
              <label className="field-label" htmlFor="ocr-text">
                {t('ocr.label')}
              </label>
              {ocrQuality !== null && ocrQuality < 0.7 && text.trim() ? (
                <div className="alert alert-warn" role="status" style={{ marginTop: 0, marginBottom: 10 }}>
                  <strong>{t('ocr.warnTitle')}</strong> {t('ocr.warnBody')}
                </div>
              ) : null}
              {aiReady && file && !aiUsed && (ocrQuality === null || ocrQuality < 0.85) ? (
                <div className="ai-ocr">
                  <button type="button" className="btn btn-primary btn-small" onClick={runAiOcr} disabled={aiBusy || busy}>
                    {aiBusy ? t('ocr.aiBusy') : t('ocr.ai')}
                  </button>
                  <span className="fine">{t('ocr.aiNote')}</span>
                </div>
              ) : null}
              {aiUsed ? <p className="fine">{t('ocr.aiDone')}</p> : null}
              {aiError ? (
                <div className="alert alert-warn" role="status" style={{ marginTop: 0, marginBottom: 10 }}>
                  {t('ocr.aiFail')}
                </div>
              ) : null}
              <textarea
                id="ocr-text"
                ref={editRef}
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                placeholder={t('ocr.placeholder')}
                lang="ar"
              />
              <p className="field-hint">{t('ocr.hint')}</p>
              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={busy || !text.trim()}
                  onClick={() => runVerify(text, { fromImage: true, extractedText: extracted })}
                >
                  {t('btn.continue')}
                </button>
                <button className="btn btn-ghost" onClick={resetAll} disabled={busy}>
                  {t('btn.restart')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel">
          <label className="field-label" htmlFor="input-text">
            {t('text.label')}
          </label>
          <textarea
            id="input-text"
            ref={textRef}
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder={t('text.placeholder')}
            lang="ar"
          />
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy || !text.trim()}
              onClick={() => runVerify(text, { fromImage: false, extractedText: '' })}
            >
              {t('btn.verify')}
            </button>
            {text ? (
              <button className="btn btn-ghost" onClick={resetAll} disabled={busy}>
                {t('btn.clear')}
              </button>
            ) : null}
          </div>

          {phase !== 'done' && !busy ? (
            <>
              <h3 className="examples-title">{t('examples.title')}</h3>
              <div className="examples">
                {EXAMPLES.map((ex) => (
                  <button key={ex.key} className="example" onClick={() => applyExample(ex.text)}>
                    <b>{t(`ex.${ex.key}.t`)}</b>
                    <span className="ar">{ex.text.split('\n')[0]}</span>
                    <small>{t(`ex.${ex.key}.n`)}</small>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {phase === 'verifying' ? (
        <div className="loading" aria-live="polite">
          {verifySteps.map((s, i) => (
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

      <div ref={resultRef}>
        {result ? (
          <ResultCard
            result={result}
            onRetry={() => runVerify(text, lastOpts)}
            onEdit={() => {
              setResult(null);
              setPhase(lastOpts.fromImage ? 'review' : 'idle');
              setTimeout(() => {
                const el = lastOpts.fromImage ? editRef.current : textRef.current;
                el?.focus();
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 60);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
