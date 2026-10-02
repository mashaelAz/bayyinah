import { gradeTone } from './grades.ts';
import type { VerificationResult } from './types.ts';

export type Expect = 'found' | 'variant' | 'not_strong' | 'not_found' | 'found_extras' | 'quran';

export interface EvalCase {
  id: string;
  category: string;
  expect: Expect;
  text: string;
}

export const EXPECT_LABEL: Record<Expect, string> = {
  found: 'يُعثر عليه في المصدر',
  variant: 'يُكشف اختلاف اللفظ',
  not_strong: 'لا يُعرض على أنه ثابت',
  not_found: 'لا يُنسب للنبي ﷺ (لم نعثر)',
  found_extras: 'يُعثر عليه وتُستبعد الإضافات',
  quran: 'يُتعرّف عليه آيةً',
};

/** هل سلوك النظام مطابق للمتوقع؟ يقيس السلوك فقط، لا الحكم على الحديث */
export function passes(expect: Expect, r: VerificationResult): boolean {
  const found = r.status === 'verified_match' || r.status === 'wording_variant';
  switch (expect) {
    case 'found':
      return found;
    case 'variant':
      return r.status === 'wording_variant';
    case 'not_strong':
      return !(found && gradeTone(r.best?.record.grade ?? null) === 'strong');
    case 'not_found':
      return r.status === 'not_found';
    case 'found_extras':
      return found && r.extraction.extraPhrases.length > 0;
    case 'quran':
      return r.extraction.contentType === 'quran';
  }
}

/** بصمة النتيجة لقياس الثبات عبر المحاولات المكررة */
export function fingerprint(r: VerificationResult): string {
  return [r.status, r.best?.record.scholar ?? '', r.best?.record.source ?? '', r.best?.record.reference ?? ''].join('|');
}
