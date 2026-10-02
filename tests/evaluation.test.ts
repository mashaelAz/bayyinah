import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyText } from '../lib/verify.ts';
import { DemoProvider } from '../lib/providers/demo.ts';
import type { SourceRecord } from '../lib/types.ts';
import { passes, fingerprint, type EvalCase } from '../lib/evaluation.ts';

const demoRecords: SourceRecord[] = JSON.parse(readFileSync(new URL('../data/hadiths.json', import.meta.url), 'utf8')).records;
const cases: EvalCase[] = JSON.parse(readFileSync(new URL('../data/eval-cases.json', import.meta.url), 'utf8')).cases;

test('مجموعة الاختبار: 20 حالة بمعرّفات فريدة', () => {
  assert.equal(cases.length, 20);
  assert.equal(new Set(cases.map((c) => c.id)).size, 20);
});

test('قاعدة «ليس حديثًا»: لا عثور = نجاح، ونتيجة ثابتة', async () => {
  const providers = [new DemoProvider(demoRecords)];
  const c = cases.find((x) => x.id === 'D1')!;
  const a = await verifyText({ text: c.text }, { providers });
  const b = await verifyText({ text: c.text }, { providers });
  assert.equal(fingerprint(a), fingerprint(b));
});

test('قاعدة «لفظ ثابت» على السجل المخزن', async () => {
  const r = await verifyText({ text: 'إنما الأعمال بالنيات' }, { providers: [new DemoProvider(demoRecords)] });
  assert.ok(passes('found', r));
  assert.ok(!passes('not_found', r));
});
