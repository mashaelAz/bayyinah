import VerifyPanel from '../../components/VerifyPanel';

export const metadata = { title: 'تحقق الآن — تثبّت' };

export default function VerifyPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title" style={{ fontSize: 34 }}>
          تحقق الآن
        </h1>
        <p className="section-sub">ارفع لقطة البطاقة أو الصق النص. ستراجع النص قبل البحث، ثم ترى المصدر والحكم كما وردا.</p>
        <VerifyPanel />
      </div>
    </div>
  );
}
