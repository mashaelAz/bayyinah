import type { VerificationResult, ResultStatus } from '../lib/types.ts';
import { gradeTone } from '../lib/grades.ts';
import { levelLabel, matchableSourceText } from '../lib/display.ts';
import DiffView from './DiffView';
import EvidenceTrail from './EvidenceTrail';
import ShareBox from './ShareBox';

const STATUS_LABEL: Record<ResultStatus, string> = {
  verified_match: '✓ مطابقة موثقة',
  wording_variant: '! وُجد الحديث باختلاف في اللفظ',
  not_found: 'لم نعثر على هذا اللفظ',
  needs_review: 'يحتاج إلى تثبّت',
  source_unavailable: 'تعذر الوصول إلى المصدر',
};

const TYPE_NOTE: Partial<Record<VerificationResult['extraction']['contentType'], string>> = {
  unknown: 'يبدو أن النص يحتاج إلى تحديد مصدره أولًا. بحثنا عنه كنص منقول دون افتراض أنه حديث نبوي.',
  quran: 'يبدو أن النص آية قرآنية. هذه الأداة مخصصة للأحاديث، فراجع المصحف أو موقعًا قرآنيًا موثوقًا للتحقق من الآية.',
  dua: 'يبدو أن النص دعاء. بحثنا عنه في المصادر الحديثية دون افتراض أنه مأثور عن النبي ﷺ.',
  athar: 'يبدو أن النص أثر منسوب إلى صحابي أو تابعي، وليس حديثًا مرفوعًا إلى النبي ﷺ.',
  saying: 'يبدو أن النص قول منسوب إلى عالم، وليس حديثًا نبويًا.',
};

export default function ResultCard({ result }: { result: VerificationResult }) {
  const { status, best, extraction, diff } = result;
  const grade = best?.record.grade?.trim() || null;
  const tone = gradeTone(grade);
  const similarityPct = best ? Math.round(best.similarity * 100) : 0;
  const showedTextDiffers = extraction.searchText.trim() !== extraction.originalText.trim();
  const typeNote = TYPE_NOTE[extraction.contentType];

  return (
    <article className="result" aria-live="polite" aria-labelledby="result-status">
      <div className="result-head">
        <span id="result-status" className={`status status-${status}`}>
          {STATUS_LABEL[status]}
        </span>
        {best ? (
          <a className="source-badge" href={best.record.source_url} target="_blank" rel="noopener noreferrer">
            مصدر موثق: {result.provider.fallbackUsed || !result.provider.live ? 'الدرر السنية (نسخة مخزنة)' : 'الدرر السنية'}
          </a>
        ) : null}
      </div>

      <p className="explain">{result.explanation}</p>

      {typeNote ? <div className="alert alert-info">{typeNote}</div> : null}

      {result.provider.fallbackUsed ? (
        <div className="alert alert-info">
          تعذر الاتصال المباشر بالدرر السنية، فعرضنا النتيجة من نسخة مخزنة منسوخة منها. افتح رابط المصدر للتأكد من النسخة الحالية.
        </div>
      ) : null}

      <section className="block" aria-labelledby="checked-title">
        <h3 id="checked-title">النص الذي تم التحقق منه</h3>
        <p className="quote">{extraction.searchText}</p>
        {showedTextDiffers ? (
          <details className="raw" style={{ marginTop: 10 }}>
            <summary>عرض النص الأصلي كما في البطاقة</summary>
            <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{extraction.originalText}</p>
          </details>
        ) : null}
        {extraction.attribution ? (
          <p className="fine" style={{ marginBottom: 0 }}>
            صيغة النسبة في البطاقة: «{extraction.attribution}» — فُصلت عن البحث، ولا تعني ثبوت النسبة.
          </p>
        ) : null}
      </section>

      {extraction.extraPhrases.length ? (
        <section className="block" aria-labelledby="extras-title">
          <h3 id="extras-title">عبارات إضافية في البطاقة</h3>
          <div className="extras">
            {extraction.extraPhrases.map((p, i) => (
              <span key={i}>{p}</span>
            ))}
          </div>
          <p className="fine" style={{ marginBottom: 0 }}>
            تم استبعاد هذه العبارات من البحث عن أصل الحديث لأنها ليست جزءًا من النص المراد مطابقته، ولم تُحذف من النص الأصلي.
          </p>
        </section>
      ) : null}

      {best ? (
        <>
          <section className="block quote-source" aria-labelledby="source-title">
            <h3 id="source-title">أقرب نص موثق في المصدر</h3>
            <p className="quote">{matchableSourceText(best.record.text)}</p>
          </section>

          <div className="ruling">
            <span className="label">حكم المحدّث، كما ورد في المصدر</span>
            {grade ? (
              <span className={`grade tone-${tone}`}>{grade}</span>
            ) : (
              <span className="grade tone-neutral">لم يذكر المصدر حكمًا لهذه الرواية</span>
            )}
            <span className="note">
              هذا الحكم منقول من المصدر ومنسوب إلى صاحبه، وليس حكمًا من الذكاء الاصطناعي.
              {status === 'wording_variant' ? ' وهو يخص لفظ المصدر، لا الصيغة المتداولة.' : ''}
            </span>
          </div>

          <section className="block" aria-labelledby="meta-title">
            <h3 id="meta-title">بيانات الرواية</h3>
            <dl className="meta">
              <div>
                <dt>الراوي</dt>
                <dd>{best.record.narrator || 'غير مذكور في المصدر'}</dd>
              </div>
              <div>
                <dt>المحدّث صاحب الحكم</dt>
                <dd>{best.record.scholar || 'غير مذكور'}</dd>
              </div>
              <div>
                <dt>المصدر</dt>
                <dd>{best.record.source || 'غير مذكور'}</dd>
              </div>
              <div>
                <dt>الصفحة أو الرقم</dt>
                <dd>{best.record.reference || 'غير مذكور'}</dd>
              </div>
            </dl>
            {best.record.takhrij ? (
              <>
                <h3 style={{ marginTop: 16 }}>التخريج</h3>
                <p style={{ margin: 0 }}>{best.record.takhrij}</p>
              </>
            ) : null}
            <div className="actions">
              <a className="btn btn-ghost btn-small" href={best.record.source_url} target="_blank" rel="noopener noreferrer">
                عرض المصدر الأصلي
              </a>
            </div>
          </section>

          <section className="block meter" aria-labelledby="meter-title">
            <h3 id="meter-title" style={{ margin: 0 }}>
              مطابقة النص: {similarityPct}%{best.isPartOfSource ? ' (النص جزء من رواية أطول)' : ''}
            </h3>
            <div className="meter-bar" role="img" aria-label={`مطابقة النص ${similarityPct}%`}>
              <span style={{ width: `${similarityPct}%` }} />
            </div>
            <small>
              هذه النسبة تقيس تشابه النص فقط ولا تمثل حكمًا على صحة الحديث. مستوى المطابقة: {levelLabel(best.level)}.
            </small>
          </section>

          {diff && (diff.addedCount > 0 || diff.removedCount > 0) ? <DiffView diff={diff} /> : null}

          {result.otherRulings.length > 1 ? (
            <section className="block" aria-labelledby="rulings-title">
              <h3 id="rulings-title">أحكام المحدثين على الروايات المطابقة</h3>
              <div className="table-wrap">
                <table className="rulings-table">
                  <thead>
                    <tr>
                      <th scope="col">المحدّث</th>
                      <th scope="col">الراوي</th>
                      <th scope="col">المصدر</th>
                      <th scope="col">خلاصة الحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.otherRulings.map((r, i) => (
                      <tr key={i}>
                        <td>{r.scholar}</td>
                        <td>{r.narrator || '—'}</td>
                        <td>
                          {r.source} {r.reference}
                        </td>
                        <td className={`tone-${gradeTone(r.grade)}`}>{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fine" style={{ marginBottom: 0 }}>
                قد تختلف الأحكام باختلاف طرق الرواية ورواتها. الأحكام منقولة كما هي، ولا يرجّح النظام بينها.
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      {status === 'needs_review' || status === 'not_found' ? (
        <div className="escalate">
          <strong>{status === 'needs_review' ? 'هذه الحالة تحتاج إلى مراجعة متخصصة' : 'قبل إعادة النشر'}</strong>
          {status === 'needs_review'
            ? 'لم نعثر على دليل كافٍ لإعطاء نتيجة موثقة تلقائيًا. راجع المصدر أو أهل الاختصاص قبل إعادة نشر النص.'
            : 'لم نعثر على تطابق كافٍ في المصادر المتاحة. ابحث في المصدر بنفسك أو اسأل أهل الاختصاص، ولا تنسب النص إلى النبي ﷺ دون تثبّت.'}
          <div className="actions">
            <a className="btn btn-ghost btn-small" href={result.searchUrl} target="_blank" rel="noopener noreferrer">
              ابحث في الدرر السنية بنفسك
            </a>
          </div>
        </div>
      ) : null}

      <EvidenceTrail steps={result.evidence} />

      {status !== 'source_unavailable' ? <ShareBox result={result} /> : null}

      <p className="fine">
        تثبّت أداة تقنية مساعدة للوصول إلى المصادر الحديثية، وليست جهة إصدار فتوى أو حكم شرعي مستقل.
      </p>
    </article>
  );
}
