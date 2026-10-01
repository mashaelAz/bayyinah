'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearHistory, readHistory, type HistoryEntry } from '../../lib/history.ts';
import type { ResultStatus } from '../../lib/types.ts';

const LABEL: Record<ResultStatus, string> = {
  verified_match: 'مطابقة موثقة',
  wording_variant: 'اختلاف في اللفظ',
  not_found: 'لم نعثر على هذا اللفظ',
  needs_review: 'يحتاج إلى تثبّت',
  source_unavailable: 'تعذر الوصول إلى المصدر',
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setItems(readHistory());
  }, []);

  const list = items ?? [];
  const found = list.filter((i) => i.status === 'verified_match' || i.status === 'wording_variant').length;
  const variants = list.filter((i) => i.status === 'wording_variant').length;

  return (
    <div className="page">
      <div className="container prose">
        <h1>آخر عمليات التحقق</h1>
        <p>هذا السجل محفوظ في متصفحك فقط، والأرقام أدناه من استخدامك الفعلي على هذا الجهاز.</p>

        <div className="stats">
          <div className="stat">
            <b>{list.length}</b>
            <span>عملية تحقق</span>
          </div>
          <div className="stat">
            <b>{found}</b>
            <span>نص وُجد له مصدر</span>
          </div>
          <div className="stat">
            <b>{variants}</b>
            <span>نص فيه اختلاف في اللفظ</span>
          </div>
        </div>

        {items === null ? null : list.length === 0 ? (
          <p>
            لا توجد عمليات تحقق بعد. <Link href="/verify">ابدأ التحقق</Link> وستظهر نتائجك هنا.
          </p>
        ) : (
          <>
            {list.map((i) => (
              <div key={i.id} className="history-item">
                <p>{i.text}</p>
                <small>
                  {LABEL[i.status]}
                  {i.source ? `، المصدر: ${i.source}` : ''}
                  {i.grade ? `، حكم المحدّث: ${i.grade}` : ''}
                  {'، '}
                  {new Date(i.at).toLocaleString('ar-SA')}
                </small>
                <Link href={`/result?q=${encodeURIComponent(i.text)}`} style={{ fontSize: 14 }}>
                  إعادة التحقق
                </Link>
              </div>
            ))}
            <div className="actions">
              <button
                className="btn btn-ghost btn-small"
                onClick={() => {
                  clearHistory();
                  setItems([]);
                }}
              >
                مسح السجل
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
