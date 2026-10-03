import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGrounding } from '../lib/ai/groundCheck.ts';

// بيانات نتيجة كما يبنيها الموقع لـ«اسأل بيّنة»
const ctx = [
  'حالة النتيجة: ورد بهذا اللفظ في المصدر',
  'نص البطاقة: «البخيل من ذكرت عنده فلم يصل علي»',
  'أقرب نص في المصدر: «البخيل الذي من ذكرت عنده فلم يصل علي»',
  'المحدّث: الألباني | الكتاب: جامع الترمذي | الرقم: 3546 | الراوي: -',
  'حكم المحدّث كما ورد: صحيح',
  'نسبة التشابه بين نص المستخدم ونص المصدر: 94%',
  'مصدر البيانات: متون الكتب الستة المحفوظة في بيّنة',
].join('\n');

test('إجابة مسندة: كل ما فيها موجود في البيانات', () => {
  const r = checkGrounding('الحديث في جامع الترمذي برقم 3546، وحكم الألباني عليه: صحيح. ونسبة التشابه 94%.', ctx);
  assert.equal(r.ok, true, r.issues.join(','));
});

test('رقم مخترع يُحجب', () => {
  const r = checkGrounding('رواه الترمذي برقم 3545.', ctx);
  assert.equal(r.ok, false);
  assert.ok(r.issues.includes('3545'));
});

test('كتاب ليس في البيانات يُحجب', () => {
  const r = checkGrounding('وأخرجه أيضًا الإمام أحمد في مسند أحمد.', ctx);
  assert.equal(r.ok, false);
});

test('محدّث ليس في البيانات يُحجب', () => {
  const r = checkGrounding('وصححه ابن حجر كذلك.', ctx);
  assert.equal(r.ok, false);
  assert.ok(r.issues.includes('ابن حجر'));
});

test('حكم مخالف للبيانات يُحجب، و«صحيح» في اسم الكتاب لا تُحسب حكمًا', () => {
  const weakCtx = ctx.replace('حكم المحدّث كما ورد: صحيح', 'حكم المحدّث كما ورد: ضعيف').replace('جامع الترمذي', 'صحيح البخاري');
  assert.equal(checkGrounding('هذا الحديث صحيح.', weakCtx).ok, false);
  assert.equal(checkGrounding('هذا الحديث ضعيف.', weakCtx).ok, true);
});

test('شرح عام لمصطلح دون نسبته للحديث مسموح', () => {
  assert.equal(checkGrounding('الحديث الضعيف عند العلماء ما لم تجتمع فيه شروط القبول.', ctx).ok, true);
});

test('أرقام القوائم ليست معلومات، وأرقام السؤال مسموحة', () => {
  assert.equal(checkGrounding('1. انشره بلفظ المصدر\n2. اذكر الكتاب والرقم 3546', ctx).ok, true);
  assert.equal(checkGrounding('نعم، الرقم 77 الذي سألت عنه ليس في النتيجة.', ctx, 'هل رقمه 77؟').ok, true);
});

test('سورة ليست في البيانات تُحجب', () => {
  const qctx = 'نتيجة البحث في المصحف الشريف: النص من القرآن الكريم، سورة الحجرات، الآية 6.';
  assert.equal(checkGrounding('الآية في سورة الحجرات رقم 6.', qctx).ok, true);
  assert.equal(checkGrounding('الآية في سورة النور.', qctx).ok, false);
});

test('«أبي داود» و«أبو داود» صيغة واحدة', () => {
  const dctx = 'المحدّث: الألباني | الكتاب: سنن أبي داود | الرقم: 3855\nحكم المحدّث كما ورد: صحيح';
  assert.equal(checkGrounding('رواه أبو داود برقم 3855 وصححه الألباني.', dctx).ok, true);
});
