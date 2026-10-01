import PageHead from '../../components/PageHead';
import VerifyPanel from '../../components/VerifyPanel';

export const metadata = { title: 'تحقق الآن — تثبّت' };

export default function VerifyPage() {
  return (
    <div className="page">
      <PageHead title="تحقق الآن" sub="ارفع لقطة البطاقة أو الصق النص. ستراجع النص قبل البحث، ثم ترى المصدر والحكم كما وردا." />
      <div className="container">
        <VerifyPanel />
      </div>
    </div>
  );
}
