import type { SourceRecord } from './types.ts';

/**
 * يُرجع خلاصة حكم المحدّث كما وردت في سجل المصدر حرفيًا.
 * لا يستنتج ولا يُكمل ولا يُرجّح؛ إذا لم يذكر المصدر حكمًا يُرجع null.
 */
export function extractSourceGrade(record: SourceRecord): string | null {
  const g = record.grade?.trim();
  return g ? g : null;
}

export type GradeTone = 'strong' | 'weak' | 'neutral';

/**
 * تلوين بصري فقط لنص الحكم المنقول، ليسهل على القارئ تمييزه.
 * لا يغيّر نص الحكم ولا يُعرض بديلًا عنه، والنص المنقول هو المرجع دائمًا.
 */
export function gradeTone(grade: string | null): GradeTone {
  if (!grade) return 'neutral';
  const g = grade.replace(/[ً-ٰٟ]/g, '');
  if (/موضوع|باطل|كذب|لا أصل|لا اصل|لا يصح|منكر|ضعيف|واه|ليس بشيء|خطأ|لا يثبت|شاذ|مكذوب/.test(g)) {
    return 'weak';
  }
  if (/صحيح|حسن|جيد|ثابت|ثبت|مجمع على صحته|مشهور بالصحة|رجاله ثقات|متفق عليه/.test(g)) {
    return 'strong';
  }
  return 'neutral';
}
