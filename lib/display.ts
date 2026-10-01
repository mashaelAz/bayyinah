import type { TextMatch } from './types.ts';

/** للعرض والمقارنة: النص الكامل داخل «[يعني حديث: ...]» إن وُجد */
export function matchableSourceText(text: string): string {
  const inner = text.match(/\[\s*يعني\s+حديث\s*[:：]\s*([^\]]+)\]/);
  return (inner ? inner[1] : text).trim();
}

export function levelLabel(level: TextMatch['level']): string {
  return {
    exact: 'تطابق حرفي',
    normalized_exact: 'تطابق بعد التطبيع',
    phrase: 'تطابق عبارة',
    fuzzy: 'تشابه تقريبي',
    none: 'لا تطابق',
  }[level];
}
