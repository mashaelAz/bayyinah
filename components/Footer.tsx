import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <strong style={{ fontSize: 19, color: 'var(--pine)' }}>تثبّت</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>تقنية تساعدك على الوصول إلى المصدر قبل النشر.</p>
          </div>
          <nav className="footer-links" aria-label="روابط التذييل">
            <Link href="/sources">المصادر</Link>
            <Link href="/how">المنهجية</Link>
            <Link href="/disclaimer">إخلاء المسؤولية</Link>
            <Link href="/privacy">سياسة الخصوصية</Link>
          </nav>
        </div>
        <p className="disclaimer">
          تثبّت أداة تقنية مساعدة للوصول إلى المصادر الحديثية، وليست جهة إصدار فتوى أو حكم شرعي مستقل. الأحكام الحديثية
          المعروضة منسوبة إلى أصحابها ومصادرها، وقد تتطلب بعض الحالات الرجوع إلى أهل العلم والمتخصصين. المشروع مستقل ولا
          يمثل الجهات المذكورة ولا يرتبط بها بشراكة رسمية.
        </p>
      </div>
    </footer>
  );
}
