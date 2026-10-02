import { gradeTone } from './grades.ts';
import { matchableSourceText } from './display.ts';
import type { VerificationResult } from './types.ts';

/**
 * «التصحيح»: ماذا ينشر المستخدم بدل البطاقة المتداولة؟
 *
 * قاعدة: النص المصحح هو نص المصدر حرفيًا، والحكم منقول منه حرفيًا.
 * لا يولّد النظام صياغة جديدة ولا حكمًا جديدًا؛ يختار فقط نوع التوجيه بحسب الحالة ولفظ الحكم.
 */
export type CorrectionKind =
  | 'share_with_source' // لفظ ثابت وحكم مقوٍّ: انشره بلفظ المصدر مع ذكره
  | 'use_source_wording' // اللفظ المتداول محرّف وحكم المصدر مقوٍّ: انشر لفظ المصدر بدلًا منه
  | 'weak' // حكم المصدر بالتضعيف: لا يُنسب للنبي ﷺ دون بيان حكمه
  | 'state_ruling' // حكم غير صريح التقوية أو التضعيف: يُذكر الحكم كما ورد
  | 'review' // تعارض أو مطابقة جزئية: لا يُنشر قبل سؤال المختص
  | 'not_found' // لم يُعثر عليه: لا يُنسب للنبي ﷺ
  | 'none'; // تعذر المصدر

export interface Correction {
  kind: CorrectionKind;
  /** النص المصحح كما في المصدر، إن وُجد */
  text: string | null;
  grade: string | null;
  scholar: string | null;
  source: string | null;
  reference: string | null;
  sourceUrl: string | null;
  /** العبارات المضافة التي حُذفت من النسخة المصححة */
  removedExtras: string[];
}

export function buildCorrection(r: VerificationResult): Correction {
  const best = r.best;
  const base: Correction = {
    kind: 'none',
    text: null,
    grade: null,
    scholar: null,
    source: null,
    reference: null,
    sourceUrl: null,
    removedExtras: r.extraction.extraPhrases,
  };

  if (r.status === 'source_unavailable') return base;
  if (r.status === 'not_found' || !best) return { ...base, kind: 'not_found' };

  const grade = best.record.grade?.trim() || null;
  const withSource: Correction = {
    ...base,
    text: matchableSourceText(best.record.text),
    grade,
    scholar: best.record.scholar || null,
    source: best.record.source || null,
    reference: best.record.reference || null,
    sourceUrl: best.record.source_url,
  };

  if (r.status === 'needs_review') return { ...withSource, kind: 'review' };

  const tone = gradeTone(grade);
  if (tone === 'weak') return { ...withSource, kind: 'weak' };
  if (tone === 'neutral') return { ...withSource, kind: 'state_ruling' };
  return { ...withSource, kind: r.status === 'wording_variant' ? 'use_source_wording' : 'share_with_source' };
}

/** نص جاهز للنسخ والنشر. labels تأتي من الترجمة في الواجهة */
export function correctionShareText(
  c: Correction,
  labels: { grade: string; source: string; footer: string; warning: string },
): string {
  const lines: string[] = [];
  if (c.kind === 'not_found') {
    lines.push(labels.warning);
  } else if (c.text) {
    if (c.kind === 'weak' || c.kind === 'review') lines.push(labels.warning);
    lines.push(`«${c.text}»`);
    if (c.grade) lines.push(`${labels.grade}: ${c.grade}${c.scholar ? ` (${c.scholar})` : ''}`);
    if (c.source) lines.push(`${labels.source}: ${c.source}${c.reference ? ` ${c.reference}` : ''}`);
  }
  lines.push(labels.footer);
  return lines.join('\n');
}
