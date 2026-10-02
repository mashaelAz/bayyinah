import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeArabic } from '../lib/arabic/normalize.ts';
import { extractSearchText } from '../lib/arabic/extract.ts';
import { parseDorarResponse } from '../lib/providers/dorarParser.ts';
import { DemoProvider } from '../lib/providers/demo.ts';
import { ProviderUnavailableError } from '../lib/providers/types.ts';
import { verifyText } from '../lib/verify.ts';
import { diffTexts } from '../lib/matching/diff.ts';
import { gradeTone } from '../lib/grades.ts';
import type { HadithProvider } from '../lib/providers/types.ts';
import type { SourceRecord } from '../lib/types.ts';

const demo: SourceRecord[] = JSON.parse(readFileSync(new URL('../data/hadiths.json', import.meta.url), 'utf8')).records;
const fixture = JSON.parse(readFileSync(new URL('./fixtures/dorar-niyyat.json', import.meta.url), 'utf8'));
const demoChain = [new DemoProvider(demo)];

const down: HadithProvider = {
  id: 'dorar-browser',
  live: true,
  async searchHadithSources() {
    throw new ProviderUnavailableError('offline');
  },
};

test('التطبيع يزيل التشكيل والتطويل ويوحّد الحروف', () => {
  assert.equal(normalizeArabic('إِنَّمَا الأعـــمالُ بالنِّيَّاتِ'), 'انما الاعمال بالنيات');
  assert.equal(normalizeArabic('قال ﷺ: «مرحبًا»'), 'قال مرحبا');
});

test('فصل العبارات الدعوية وصيغة النسبة دون حذفها من الأصل', () => {
  const input = 'قال رسول الله ﷺ: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى\nانشر تؤجر\nلا تجعلها تقف عندك';
  const r = extractSearchText(input);
  assert.equal(r.originalText, input);
  assert.equal(r.searchText, 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى');
  assert.equal(r.extraPhrases.length, 2);
  assert.ok(r.attribution?.includes('رسول الله'));
  assert.equal(r.contentType, 'hadith');
});

test('عبارة دعوية ملتصقة بآخر المتن تُفصل', () => {
  const r = extractSearchText('إنما الأعمال بالنيات وإنما لكل امرئ ما نوى انشر تؤجر');
  assert.equal(r.searchText, 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى');
  assert.deepEqual(r.extraPhrases, ['انشر تؤجر']);
});

test('«صدقة جارية» في آخر متن الحديث لا تُحذف', () => {
  const r = extractSearchText('إذا مات الإنسان انقطع عنه عمله إلا من ثلاثة إلا من صدقة جارية');
  assert.ok(r.searchText.endsWith('صدقة جارية'));
  assert.equal(r.extraPhrases.length, 0);
});

test('لا يُصنّف النص حديثًا بلا نسبة صريحة', () => {
  assert.equal(extractSearchText('من جد وجد ومن زرع حصد').contentType, 'unknown');
});

test('تحليل استجابة الدرر السنية الحقيقية', () => {
  const recs = parseDorarResponse(fixture, 'إنما الأعمال بالنيات', '2026-10-01');
  assert.equal(recs.length, 3);
  assert.equal(recs[0].narrator, '[عمر بن الخطاب]');
  assert.equal(recs[0].scholar, 'النووي');
  assert.equal(recs[0].grade, 'ثبت في الحديث المجمع على صحته');
  assert.equal(recs[1].narrator, '');
  assert.equal(recs[2].text, 'إنما الأعمالُ بالنياتِ وإنما لكلِّ امرئٍ ما نَوَى');
  assert.equal(recs[2].reference, '14');
  assert.equal(recs[2].grade, 'صحيح');
});

test('مطابقة موثقة: الحكم منقول من السجل حرفيًا', async () => {
  const r = await verifyText({ text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى' }, { providers: demoChain });
  assert.equal(r.status, 'verified_match');
  assert.ok(r.best);
  const fromRecord = demo.find((d) => d.id === r.best!.record.id)!;
  assert.equal(r.best!.record.grade, fromRecord.grade);
  assert.ok(r.best!.record.source_url.startsWith('https://dorar.net/'));
});

test('اختلاف في اللفظ: تُكشف الكلمات المضافة', async () => {
  const text = 'قال رسول الله ﷺ: «إنما الأعمال بالنية، وإنما لكل إنسان ما نوى، فمن صدقت نيته بلغ مراده» انشر تؤجر';
  const r = await verifyText({ text }, { providers: demoChain });
  assert.equal(r.status, 'wording_variant');
  assert.ok(r.diff && r.diff.addedCount >= 4);
  assert.equal(r.provider.fallbackUsed, false);
});

test('لا تطابق: لا يوصف النص بأنه موضوع', async () => {
  const r = await verifyText({ text: 'من جد وجد ومن زرع حصد' }, { providers: demoChain });
  assert.equal(r.status, 'not_found');
  assert.equal(r.best, null);
  assert.ok(r.evidence.some((e) => e.code === 'found'));
});

test('تعذر المصدر بلا بديل: لا تصدر نتيجة', async () => {
  const r = await verifyText({ text: 'إنما الأعمال بالنيات' }, { providers: [down] });
  assert.equal(r.status, 'source_unavailable');
  assert.equal(r.best, null);
});

test('تعذر المصدر مع البديل: تُستخدم النسخة المخزنة ويُصرّح بذلك', async () => {
  const r = await verifyText(
    { text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى' },
    { providers: [down, new DemoProvider(demo)] },
  );
  assert.equal(r.status, 'verified_match');
  assert.equal(r.provider.fallbackUsed, true);
});

test('تعذر المصدر مع البديل ولا تطابق: لا نقول «لم نعثر»', async () => {
  const r = await verifyText(
    { text: 'من جد وجد ومن زرع حصد' },
    { providers: [down, new DemoProvider(demo)] },
  );
  assert.equal(r.status, 'source_unavailable');
});

test('بصمة النص تحسب الإضافة والحذف', () => {
  const d = diffTexts('إنما الأعمال بالنيات وإنما لكل امرئ ما نوى ونيته خير', 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى');
  assert.equal(d.addedCount, 2);
  assert.equal(d.removedCount, 0);
});

test('تلوين الحكم بصري فقط', () => {
  assert.equal(gradeTone('صحيح'), 'strong');
  assert.equal(gradeTone('إسناده ضعيف'), 'weak');
  assert.equal(gradeTone('لا يصح'), 'weak');
  assert.equal(gradeTone('غريب من هذا الوجه'), 'neutral');
});

test('إشارة المصدر على البطاقة تُستبعد من البحث', () => {
  const r = extractSearchText('قال رسول الله ﷺ:\nالبخيل من ذكرت عنده فلم يصل علي\nصحيح الترمذي ٣٥٤٦');
  assert.equal(r.searchText, 'البخيل من ذكرت عنده فلم يصل علي');
  assert.equal(r.extraPhrases.length, 1);
});

test('سلسلة المزوّدات: يُستخدم الثاني إذا فشل الأول، ويُسجّل الفشل في الدليل', async () => {
  const live: HadithProvider = { id: 'dorar-server', live: true, searchHadithSources: (q) => new DemoProvider(demo).searchHadithSources(q) };
  const r = await verifyText({ text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى' }, { providers: [down, live] });
  assert.equal(r.status, 'verified_match');
  assert.equal(r.provider.id, 'dorar-server');
  assert.equal(r.provider.fallbackUsed, false);
  assert.ok(r.evidence.some((e) => e.code === 'provider_failed' && e.params?.reason === 'offline'));
});

test('أحكام متعارضة على رواية الراوي نفسه: يحتاج إلى تثبّت', async () => {
  const r = await verifyText({ text: 'إن البخيل كل البخيل من ذكرت عنده فلم يصل علي' }, { providers: demoChain });
  assert.ok(r.best);
  assert.ok(r.otherRulings.length >= 2);
  assert.ok(r.otherRulings.every((x) => demo.some((d) => d.grade === x.grade)));
});

test('تحليل استجابة JSONP بعد فكّ الدالة', () => {
  const body = 'cbTest( ' + JSON.stringify(fixture) + ')';
  const inner = JSON.parse(body.slice(body.indexOf('(') + 1, body.lastIndexOf(')')));
  assert.equal(parseDorarResponse(inner, 'x', 'y').length, 3);
});
