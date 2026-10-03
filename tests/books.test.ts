import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { searchBooks } from '../lib/books.ts';
import { verifyText } from '../lib/verify.ts';
import { DemoProvider } from '../lib/providers/demo.ts';
import { ProviderUnavailableError, type HadithProvider } from '../lib/providers/types.ts';
import { passes, type EvalCase } from '../lib/evaluation.ts';
import type { SourceRecord } from '../lib/types.ts';

// books.ts يقرأ data/books.json من مجلد المشروع
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const demoRecords: SourceRecord[] = JSON.parse(readFileSync('data/hadiths.json', 'utf8')).records;
const cases: EvalCase[] = JSON.parse(readFileSync('data/eval-cases.json', 'utf8')).cases;

/** الدرر محجوبة (403)، فيُستخدم البديل: النسخة المخزنة + الكتب الستة، كما في الموقع الآن */
const dorarBlocked: HadithProvider = {
  id: 'dorar-browser',
  live: true,
  async searchHadithSources() {
    throw new ProviderUnavailableError('http_403');
  },
};
const demo = new DemoProvider(demoRecords);
const local: HadithProvider = {
  id: 'local',
  live: false,
  async searchHadithSources(q: string) {
    const stored = (await demo.searchHadithSources(q)).records;
    return { records: [...stored, ...searchBooks(q)], searchUrl: '', coverage: 'six_books' };
  },
};
const providers = [dorarBlocked, local];

test('الكتب الستة: أكثر من 34 ألف حديث بأرقامها', () => {
  const rows = JSON.parse(readFileSync('data/books.json', 'utf8')) as string[][];
  assert.ok(rows.length > 34000);
  const niyyat = searchBooks('انما الاعمال بالنيات');
  assert.ok(niyyat.some((r) => r.source === 'صحيح البخاري' && r.reference === '1'));
});

test('أرقام معروفة: مسلم 1164، أبو داود 3855، الترمذي 3546', async () => {
  const cases: [string, string, string][] = [
    ['من صام رمضان ثم أتبعه ستا من شوال كان كصيام الدهر', 'صحيح مسلم', '1164'],
    ['تداووا عباد الله فإن الله لم يضع داء إلا وضع له دواء', 'سنن أبي داود', '3855'],
    ['البخيل من ذكرت عنده فلم يصل علي', 'جامع الترمذي', '3546'],
  ];
  for (const [text, source, ref] of cases) {
    const r = await verifyText({ text }, { providers });
    assert.equal(r.best?.record.source, source, text);
    assert.equal(r.best?.record.reference, ref, text);
  }
});

test('حكم السنن منقول باسم صاحبه (الألباني)', async () => {
  const r = await verifyText({ text: 'البخيل من ذكرت عنده فلم يصل علي' }, { providers });
  assert.equal(r.best?.record.scholar, 'الألباني');
  assert.equal(r.best?.record.grade, 'صحيح');
});

test('ليس في الكتب الستة: نتيجة «لم يرد» مع بيان النطاق، لا «تعذر المصدر»', async () => {
  const r = await verifyText({ text: 'اطلبوا العلم ولو بالصين' }, { providers });
  assert.equal(r.status, 'not_found');
  assert.equal(r.provider.coverage, 'six_books');
  assert.ok(r.evidence.some((e) => e.code === 'six_books'));
});

test('جزء قصير من رواية أطول ضُعّفت كاملة: يحتاج إلى تثبّت، لا حكم بالضعف على الجزء', async () => {
  const r = await verifyText({ text: 'طلب العلم فريضة على كل مسلم' }, { providers });
  assert.equal(r.status, 'needs_review');
  assert.equal(r.partOfLonger, true);
});

test('مجموعة الاختبار كاملة والدرر محجوبة: 20 من 20', async () => {
  let ok = 0;
  for (const c of cases) if (passes(c.expect, await verifyText({ text: c.text }, { providers }))) ok++;
  assert.equal(ok, 20);
});
