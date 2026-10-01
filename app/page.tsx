import VerifyPanel from '../components/VerifyPanel';
import Ornament, { Star } from '../components/Ornament';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1>قبل أن تنشر… تثبّت</h1>
            <p className="hero-lede">
              تحقق من الأحاديث والعبارات الدينية المتداولة خلال ثوانٍ، بالاعتماد على مصادر حديثية موثوقة وتقنيات الذكاء
              الاصطناعي.
            </p>
            <div className="hero-actions">
              <a href="#verify-image" className="btn btn-gold">
                ارفع صورة
              </a>
              <a href="#verify-text" className="btn btn-light">
                الصق النص
              </a>
            </div>
            <p className="hero-note">لا نصدر أحكامًا شرعية آلية؛ النتائج موثقة بمصادرها.</p>
          </div>

          <figure className="specimen" aria-label="مثال لبطاقة متداولة بعد فحصها">
            <div className="mihrab">
              <Star className="star" color="#a9802f" />
              <div className="attr">قال رسول الله ﷺ:</div>
              <p className="matn">
                «<mark>إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى</mark>»
              </p>
              <span className="extra">انشر تؤجر، ولا تجعلها تقف عندك</span>
            </div>
            <div className="specimen-verdict">
              <div className="row">
                <span>حكم المحدّث، كما ورد في المصدر</span>
                <span>مطابقة النص 100%</span>
              </div>
              <div className="grade">صحيح</div>
              <div className="row" style={{ marginTop: 2 }}>
                <span>الألباني، غاية المرام، رقم 14</span>
              </div>
              <span className="cite">مصدر موثق: الدرر السنية</span>
            </div>
            <figcaption className="sr-only">
              بطاقة دعوية فُصل فيها نص الحديث عن العبارة الإضافية، ثم عُرض حكم المحدّث ومصدره.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="section" aria-labelledby="verify-title">
        <div className="container">
          <span id="verify-image" />
          <span id="verify-text" />
          <div className="section-head">
            <h2 id="verify-title" className="section-title">
              تحقق الآن
            </h2>
            <Ornament />
            <p className="section-sub">ارفع الصورة أو الصق النص، ودع التقنية تساعدك في الوصول إلى المصدر الموثوق.</p>
          </div>
          <VerifyPanel />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="principle">
            <p className="big">الذكاء الاصطناعي يحدد ويبحث ويطابق، والمصدر العلمي الموثوق هو الذي يزوّد النظام بالحكم.</p>
            <p>
              لسنا «شيخًا آليًا». تثبّت طبقة تقنية بين المحتوى المتداول والمصدر العلمي: تقرأ البطاقة، وتفصل النص عن الإضافات،
              وتبحث عنه، وتكشف ما تغيّر في ألفاظه، ثم تنقل لك حكم أهل الحديث كما هو، مع رابط تراجعه بنفسك.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
