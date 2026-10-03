import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { searchQuran } from '../lib/quran.ts';
import { quranQueryText } from '../lib/arabic/quranText.ts';
import { verifyText } from '../lib/verify.ts';
import { buildCorrection } from '../lib/correction.ts';
import { ProviderUnavailableError, type HadithProvider } from '../lib/providers/types.ts';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const noHadith: HadithProvider = {
  id: 'none',
  live: false,
  async searchHadithSources() {
    return { records: [], searchUrl: '', coverage: 'six_books' };
  },
};
const blocked: HadithProvider = {
  id: 'dorar-browser',
  live: true,
  async searchHadithSources() {
    throw new ProviderUnavailableError('http_403');
  },
};
const quran = async (t: string) => searchQuran(t);

test('تنظيف نص الآية من البطاقة: ﴿ ﴾ والمرجع و«قال تعالى» و«صدق الله العظيم»', () => {
  assert.equal(quranQueryText('قال تعالى: ﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾ [البقرة: 153]'), 'ان الله مع الصابرين');
  assert.equal(quranQueryText('قال الله تعالى: وقل رب زدني علما صدق الله العظيم'), 'وقل رب زدني علما');
});

test('آية مطابقة: السورة ورقم الآية صحيحان', () => {
  const m = searchQuran('يا أيها الذين آمنوا إن جاءكم فاسق بنبأ فتبينوا');
  assert.ok(m?.exact);
  assert.equal(m?.surahName, 'الحجرات');
  assert.equal(m?.from, 6);
});

test('آيات متتابعة: سورة الإخلاص 1–4', () => {
  const m = searchQuran('بسم الله الرحمن الرحيم قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد');
  assert.equal(m?.surahName, 'الإخلاص');
  assert.equal(m?.from, 1);
  assert.equal(m?.to, 4);
});

test('آية محرّفة اللفظ: «وقل ربي زدني علما» قريبة من طه 114 وليست مطابقة', () => {
  const m = searchQuran('وقل ربي زدني علما');
  assert.equal(m?.exact, false);
  assert.equal(m?.surahName, 'طه');
  assert.equal(m?.from, 114);
});

test('نص ليس في القرآن: لا نتيجة', () => {
  assert.equal(searchQuran('النظافة من الإيمان والوسخ من الشيطان'), null);
  assert.equal(searchQuran('اطلبوا العلم ولو كان في الصين'), null);
});

test('نص قُدّم على أنه آية وليس منها: «لم نجده في القرآن» مع بطاقة تحذير', async () => {
  const r = await verifyText({ text: 'قال تعالى: ﴿النظافة من الإيمان﴾' }, { providers: [blocked, noHadith], quran });
  assert.equal(r.status, 'not_found');
  assert.equal(r.quran, null);
  assert.equal(buildCorrection(r).kind, 'quran_missing');
});

test('آية نُسبت إلى النبي ﷺ على أنها حديث: نكشفها ونصحح النسبة', async () => {
  const r = await verifyText(
    { text: 'قال رسول الله ﷺ: وما خلقت الجن والإنس إلا ليعبدون' },
    { providers: [blocked, noHadith], quran },
  );
  assert.equal(r.quran?.surahName, 'الذاريات');
  assert.equal(r.quranMisattributed, true);
  const c = buildCorrection(r);
  assert.equal(c.kind, 'quran');
  assert.equal(c.misattributed, true);
  assert.equal(c.quranRef, 'الذاريات: 56');
});

test('لفظ آية محرّف في بطاقة: نعرض لفظ المصحف وبصمة الفرق', async () => {
  const r = await verifyText({ text: 'قال تعالى: ﴿وقل ربي زدني علما﴾' }, { providers: [blocked, noHadith], quran });
  assert.equal(r.status, 'wording_variant');
  assert.ok(r.diff && r.diff.addedCount + r.diff.removedCount > 0);
  assert.equal(buildCorrection(r).kind, 'quran_variant');
});
