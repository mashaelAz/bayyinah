import VerifyPanel from '../../components/VerifyPanel';

export const metadata = { title: 'نتيجة التحقق — تثبّت' };

export default function ResultPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = typeof searchParams.q === 'string' ? searchParams.q.slice(0, 2000) : '';
  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title" style={{ fontSize: 34 }}>
          نتيجة التحقق
        </h1>
        <p className="section-sub">
          {q ? 'أعدنا التحقق من المصدر الآن، فقد تختلف النتيجة عن وقت المشاركة إذا تحدّث المصدر.' : 'لا يوجد نص في الرابط. أدخل نصًا للتحقق منه.'}
        </p>
        <VerifyPanel autoText={q || undefined} />
      </div>
    </div>
  );
}
