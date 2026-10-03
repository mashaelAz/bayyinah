# الإعداد والتشغيل

دليل تشغيل منصة بيّنة على جهاز جديد، ونشرها، والتأكد من سلامة تشغيلها.

## 1. المتطلبات

| المتطلب | الإصدار | ملاحظة |
|---|---|---|
| Node.js | 22 أو أحدث | يتضمن npm |
| Git | أي إصدار حديث | لنسخ المستودع |
| متصفح حديث | Chrome أو Edge أو Safari أو Firefox | القراءة الضوئية تعمل داخل المتصفح |
| مفتاح Google Gemini | اختياري، مجاني | من aistudio.google.com؛ لزر «اقرأ الصورة بالذكاء الاصطناعي» و«اسأل بيّنة» |

## 2. التشغيل محليًا

```bash
git clone https://github.com/mashaelAz/bayyinah.git
cd bayyinah
npm install
npm run dev
```

ثم افتح `http://localhost:3000`.

على ويندوز: إذا ظهر خطأ «running scripts is disabled» استخدم `npm.cmd` بدل `npm`.

## 3. متغيرات البيئة (كلها اختيارية)

تُكتب في ملف `.env.local` في جذر المشروع (مستثنى من المستودع في `.gitignore`)، أو في إعدادات الاستضافة. نموذج فارغ في `.env.example`.

| المتغير | الوظيفة |
|---|---|
| `GEMINI_API_KEY` | يفعّل القراءة بالذكاء الاصطناعي و«اسأل بيّنة» بنموذج Gemini (حصة مجانية) |
| `ANTHROPIC_API_KEY` | بديل اختياري بنموذج Claude |
| `GEMINI_MODEL` / `AI_MODEL` | تغيير النموذج المستخدم |
| `DORAR_API_URL` | رابط خدمة الدرر للوسيط في الخادم (الافتراضي `https://dorar.net/dorar_api.json`) |

**بدون أي مفتاح يعمل الموقع كاملًا:** القراءة الضوئية، والبحث في الكتب الستة والمصحف، والمطابقة، والتصحيح، والبطاقة. المفاتيح تضيف الذكاء الاصطناعي فقط.

## 4. الاختبارات

```bash
npm test
```

51 اختبارًا آليًا في ثلاثة ملفات (`tests/engine.test.ts`، `tests/books.test.ts`، `tests/quran.test.ts`، `tests/ground.test.ts`)، تغطي: تنظيف النص العربي، وفصل الإضافات، والمطابقة، وأرقام أحاديث معروفة في الكتب الستة، والآيات، وعدم كتابة «موضوع» عند عدم العثور. تفاصيلها في `docs/TEST_PLAN.md`.

## 5. النشر

المنصة منشورة على **Vercel** (الخطة المجانية): https://bayyinah-eta.vercel.app

خطوات النشر من جديد:
1. من vercel.com اختر **Add New ← Project**، واستورد مستودع GitHub.
2. أضف `GEMINI_API_KEY` في **Settings ← Environment Variables** (اختياري).
3. اضغط **Deploy**. وأي تحديث يُرفع إلى GitHub يُنشر تلقائيًا خلال دقيقتين، والرابط لا يتغير.

## 6. فحص التشغيل

| الرابط | ما يعرضه |
|---|---|
| `/api/health` | حالة الموقع والخدمات المفعّلة |
| `/api/health?dorar=1` | يختبر اتصال الخادم بالدرر السنية ويعرض سبب الفشل إن وُجد |
| `/eval` | يشغّل مجموعة الاختبار (20 حالة × 3 مرات) ويقيس دقة السلوك وثبات النتائج والزمن، مع تنزيل النتائج |

## 7. إعادة بناء ملفات البيانات (عند الحاجة)

ملفا البيانات جاهزان في المستودع، ولا يلزم بناؤهما للتشغيل. لإعادة بنائهما من المصدر المفتوح:

```bash
# الكتب الستة ← data/books.json
git clone --depth 1 --filter=blob:none --sparse --branch 1 https://github.com/fawazahmed0/hadith-api
(cd hadith-api && git sparse-checkout set --no-cone '/editions/ara-*.min.json')
node scripts/build-books.mjs ./hadith-api/editions

# المصحف ← data/quran.json
git clone --depth 1 --filter=blob:none --sparse https://github.com/fawazahmed0/quran-api
(cd quran-api && git sparse-checkout set --no-cone '/editions/ara-quransimple.min.json' '/editions/ara-quranspellednod.min.json' '/editions/ara-quranuthmanihaf.min.json')
node scripts/build-quran.mjs ./quran-api
```

## 8. بنية المشروع

| المجلد | المحتوى |
|---|---|
| `app/` | الصفحات (الرئيسية، النتيجة، السجل، الخصوصية، اختبار الأداء) وخدمات الخادم (`api/local` الكتب الستة، `api/quran` المصحف، `api/ocr` القراءة بالذكاء الاصطناعي، `api/ask` المساعد، `api/dorar` وسيط الدرر، `api/health` الفحص) |
| `components/` | مكونات الواجهة: التحقق، النتيجة، التصحيح والبطاقة، المساعد، جسر الدرر |
| `lib/` | محرك التحقق: تطبيع العربية وفصل الإضافات، البحث، المطابقة وبصمة النص، التصحيح، الذكاء الاصطناعي، اللغات الست |
| `data/` | `books.json` الكتب الستة، `quran.json` المصحف، `hadiths.json` سجلات من الدرر، `eval-cases.json` مجموعة الاختبار |
| `tests/` | الاختبارات الآلية |
| `scripts/` | بناء ملفي البيانات، وفحص الاتصال بالدرر |
| `docs/` | التوثيق |
| `public/` | الأيقونات وملف التثبيت على الجوال (PWA) |

## 9. الأمان

لا يحتوي المستودع على بيانات مستفيدين، ولا كلمات مرور، ولا مفاتيح سرية. المفاتيح في `.env.local` محليًا وفي إعدادات Vercel فقط.
