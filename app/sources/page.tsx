import PageHead from '../../components/PageHead';

export const metadata = { title: 'مصادرنا — تثبّت' };

export default function SourcesPage() {
  return (
    <div className="page">
      <PageHead title="مصادرنا" />
      <div className="container prose">
        <p>نعتمد مبدأ المصدر قبل الإجابة. كل نتيجة حديثية في تثبّت مرتبطة بمصدرها، ولا تُعرض نتيجة بلا مصدر واضح.</p>

        <div className="source-entry">
          <span className="source-role">المصدر الأساسي</span>
          <h2>الموسوعة الحديثية — الدرر السنية</h2>
          <p>
            المصدر الحديثي الأساسي المستخدم في المشروع لعرض النصوص وأحكام المحدّثين ومعلومات الرواية: نص الحديث، والراوي، والمحدّث،
            والمصدر، والصفحة أو الرقم، وخلاصة حكم المحدّث. نصل إليها عبر الخدمة التقنية العامة التي يتيحها الموقع، وننقل القيم كما هي
            دون تعديل.
          </p>
          <p>
            <a href="https://dorar.net/hadith" target="_blank" rel="noopener noreferrer">
              dorar.net/hadith
            </a>
          </p>
        </div>

        <div className="source-entry">
          <span className="source-role">مرجع توعوي مساعد</span>
          <h2>الموقع الرسمي للشيخ عبدالعزيز بن باز</h2>
          <p>
            نستند إليه في منهج المشروع: التأكيد على الرجوع إلى كلام أهل الحديث، وعدم الاكتفاء بحكم غير موثق، والتفريق في التعامل بين
            الحديث الصحيح والضعيف والموضوع. لا يُستخدم في المطابقة الآلية.
          </p>
          <p>
            <a href="https://binbaz.org.sa" target="_blank" rel="noopener noreferrer">
              binbaz.org.sa
            </a>
          </p>
        </div>

        <div className="source-entry">
          <span className="source-role">اختياري للعرض الإنجليزي</span>
          <h2>Sunnah.com</h2>
          <p>
            يضم كتبًا مثل صحيح البخاري وصحيح مسلم وسنن أبي داود وجامع الترمذي وسنن النسائي وسنن ابن ماجه مع ترجماتها. قد يُستخدم
            مستقبلًا للعرض بالإنجليزية أو المقارنة، وليس مرجعًا للحكم في النسخة العربية.
          </p>
          <p>
            <a href="https://sunnah.com" target="_blank" rel="noopener noreferrer">
              sunnah.com
            </a>
          </p>
        </div>

        <div className="source-entry">
          <h2>المصادر الأصلية</h2>
          <p>
            حين يذكر المصدر كتاب الرواية، نعرض اسمه كما ورد، مثل: صحيح البخاري، وصحيح مسلم، وسنن أبي داود، وجامع الترمذي، وسنن
            النسائي، وسنن ابن ماجه، وغيرها.
          </p>
        </div>

        <div className="source-entry">
          <h2>النسخة المخزنة</h2>
          <p>
            يحتفظ المشروع بعينة صغيرة من سجلات حقيقية منسوخة من الدرر السنية، مع تاريخ نسخها ورابط مصدرها، لتعمل الأداة عند تعذر
            الاتصال. لا تحتوي أي سجل مختلق، وتُعلَّم النتائج المأخوذة منها بوضوح.
          </p>
        </div>

        <p className="fine">
          تثبّت مشروع مستقل، ولا يمتلك هذه الجهات أو يمثلها، ولا يرتبط بها بشراكة رسمية. أسماؤها مذكورة للإسناد والإحالة فقط.
        </p>
      </div>
    </div>
  );
}
