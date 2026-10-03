'use client';

import { useState } from 'react';
import PageHead from '../../components/PageHead';
import cases from '../../data/eval-cases.json';
import { verifyText } from '../../lib/verify.ts';
import { browserProviders } from '../../lib/providers/index.ts';
import { demoRecords } from '../../lib/providers/demoData.ts';
import { EXPECT_LABEL, fingerprint, passes, type EvalCase } from '../../lib/evaluation.ts';
import { translate } from '../../lib/i18n/index.tsx';
import type { VerificationResult } from '../../lib/types.ts';

const RUNS = 3;
const CASES = (cases as { cases: EvalCase[] }).cases;

interface Row {
  c: EvalCase;
  results: VerificationResult[];
  ms: number[];
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

/**
 * صفحة إعادة الاختبار: تشغّل مجموعة الاختبار كاملة عدة مرات من المتصفح على الدرر السنية مباشرة،
 * وتحسب نسبة السلوك الصحيح والثبات والزمن، وتتيح تنزيل النتائج.
 */
export default function EvalPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  async function run() {
    setRunning(true);
    setRows([]);
    const out: Row[] = CASES.map((c) => ({ c, results: [], ms: [] }));
    let done = 0;
    for (let run = 0; run < RUNS; run++) {
      // مزوّدات جديدة لكل جولة حتى لا تُستخدم نتائج محفوظة من الجولة السابقة
      const providers = browserProviders(demoRecords);
      for (const row of out) {
        const t0 = performance.now();
        const r = await verifyText({ text: row.c.text }, { providers });
        row.ms.push(Math.round(performance.now() - t0));
        row.results.push(r);
        done++;
        setProgress(pct(done, CASES.length * RUNS));
        setRows(out.map((x) => ({ ...x })));
        await new Promise((res) => setTimeout(res, 250));
      }
    }
    setRunning(false);
  }

  const complete = rows.filter((r) => r.results.length === RUNS);
  const passAll = complete.filter((r) => r.results.every((x) => passes(r.c.expect, x))).length;
  const stable = complete.filter((r) => new Set(r.results.map(fingerprint)).size === 1).length;
  const allMs = complete.flatMap((r) => r.ms);
  const avgMs = allMs.length ? Math.round(allMs.reduce((a, b) => a + b, 0) / allMs.length) : 0;
  const live = complete.flatMap((r) => r.results).filter((x) => x.provider.live).length;
  const totalRuns = complete.length * RUNS;

  function download(kind: 'csv' | 'json') {
    const data = rows.map((r) => ({
      id: r.c.id,
      category: r.c.category,
      text: r.c.text,
      expected: EXPECT_LABEL[r.c.expect],
      statuses: r.results.map((x) => x.status),
      grade: r.results[0]?.best?.record.grade ?? '',
      scholar: r.results[0]?.best?.record.scholar ?? '',
      source: r.results[0]?.best?.record.source ?? '',
      reference: r.results[0]?.best?.record.reference ?? '',
      provider: r.results.map((x) => x.provider.id),
      pass: r.results.every((x) => passes(r.c.expect, x)),
      stable: new Set(r.results.map(fingerprint)).size === 1,
      ms: r.ms,
    }));
    let body: string;
    let type: string;
    if (kind === 'json') {
      body = JSON.stringify({ runAt: new Date().toISOString(), runs: RUNS, rows: data }, null, 2);
      type = 'application/json';
    } else {
      const head = ['id', 'category', 'text', 'expected', 'statuses', 'grade', 'scholar', 'source', 'reference', 'pass', 'stable', 'avg_ms'];
      const esc = (v: unknown) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      body =
        '﻿' +
        [head.join(','), ...data.map((d) => [d.id, d.category, d.text, d.expected, d.statuses.join(' / '), d.grade, d.scholar, d.source, d.reference, d.pass, d.stable, Math.round(d.ms.reduce((a, b) => a + b, 0) / (d.ms.length || 1))].map(esc).join(','))].join('\n');
      type = 'text/csv';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type }));
    a.download = `bayyinah-eval.${kind}`;
    a.click();
  }

  return (
    <>
      <PageHead
        title="اختبار الأداء"
        sub="تشغّل هذه الصفحة مجموعة الاختبار كاملة ثلاث مرات، وتقيس دقة السلوك وثبات النتائج وزمن التحقق. يمكن إعادة تشغيلها في أي وقت للتأكد من جودة بيّنة."
      />
      <div className="page">
        <div className="container">
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn btn-primary" onClick={run} disabled={running}>
              {running ? `جاري الاختبار… ${progress}%` : `تشغيل الاختبار (${CASES.length} حالة × ${RUNS} مرات)`}
            </button>
            {complete.length ? (
              <>
                <button className="btn btn-ghost btn-small" onClick={() => download('csv')} disabled={running}>
                  تنزيل النتائج CSV
                </button>
                <button className="btn btn-ghost btn-small" onClick={() => download('json')} disabled={running}>
                  تنزيل النتائج JSON
                </button>
              </>
            ) : null}
          </div>

          <p className="fine">
            «المتوقع» يصف سلوك النظام المطلوب (أن يعثر، أو يكشف التحريف، أو يمتنع)، وليس حكمًا على الحديث. الحكم المعروض منقول
            من المصدر دائمًا.
          </p>

          {complete.length ? (
            <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="stat">
                <b>{pct(passAll, complete.length)}%</b>
                <span>
                  سلوك صحيح ({passAll} من {complete.length})
                </span>
              </div>
              <div className="stat">
                <b>{pct(stable, complete.length)}%</b>
                <span>ثبات النتيجة عبر {RUNS} محاولات</span>
              </div>
              <div className="stat">
                <b>{(avgMs / 1000).toFixed(1)} ث</b>
                <span>متوسط زمن التحقق</span>
              </div>
              <div className="stat">
                <b>{pct(live, totalRuns)}%</b>
                <span>من المصدر مباشرة</span>
              </div>
            </div>
          ) : null}

          {rows.length ? (
            <div className="table-wrap block">
              <table className="rulings-table eval-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>النص</th>
                    <th>الفئة</th>
                    <th>المتوقع</th>
                    <th>النتيجة</th>
                    <th>حكم المحدّث</th>
                    <th>نجح</th>
                    <th>ثابت</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const first = r.results[0];
                    const ok = r.results.length ? r.results.every((x) => passes(r.c.expect, x)) : null;
                    const st = r.results.length === RUNS ? new Set(r.results.map(fingerprint)).size === 1 : null;
                    return (
                      <tr key={r.c.id}>
                        <td>{r.c.id}</td>
                        <td style={{ maxWidth: 260 }}>{r.c.text}</td>
                        <td>{r.c.category}</td>
                        <td>{EXPECT_LABEL[r.c.expect]}</td>
                        <td>{first ? translate('ar', `status.${first.status}`) : '…'}</td>
                        <td>
                          {first?.best?.record.grade ?? '—'}
                          {first?.best ? <div className="fine">{first.best.record.scholar}، {first.best.record.source}</div> : null}
                        </td>
                        <td>{ok === null ? '…' : ok ? '✓' : '✗'}</td>
                        <td>{st === null ? '…' : st ? '✓' : '✗'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
