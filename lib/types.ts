/**
 * الأنواع المشتركة في بيّنة.
 *
 * قاعدة أساسية: أي حكم حديثي (grade) يأتي من سجل المصدر (SourceRecord) فقط.
 * لا يوجد في النظام أي حقل أو دالة تجعل الذكاء الاصطناعي يُصدر حكمًا.
 */

/** سجل حديثي كما ورد في المصدر الموثوق، دون أي تعديل في نصه أو حكمه. */
export interface SourceRecord {
  id: string;
  /** نص الحديث كما ورد في المصدر */
  text: string;
  /** نسخة مطبّعة لأغراض البحث فقط */
  normalized_text: string;
  narrator: string;
  scholar: string;
  source: string;
  reference: string;
  /** خلاصة حكم المحدّث، منقولة حرفيًا من المصدر. فارغة إذا لم يذكر المصدر حكمًا. */
  grade: string;
  takhrij: string;
  source_url: string;
  verified_at: string;
  provider: 'dorar' | 'demo-dorar';
}

export type ContentType =
  | 'hadith'
  | 'quran'
  | 'dua'
  | 'athar'
  | 'saying'
  | 'dawah_phrase'
  | 'unknown';

export interface ExtractionResult {
  /** النص كما أدخله المستخدم أو كما صحّحه بعد OCR */
  originalText: string;
  /** النص الذي استُخرج آليًا من الصورة (إن وُجد) */
  extractedText: string;
  /** الجزء المحدد للبحث (بالحروف الأصلية) */
  searchText: string;
  /** نسخة مطبّعة من searchText للمطابقة فقط */
  normalizedSearchText: string;
  /** عبارات إضافية استُبعدت من البحث ولم تُحذف من النص الأصلي */
  extraPhrases: string[];
  /** صيغة النسبة إن وُجدت، مثل: قال رسول الله ﷺ */
  attribution: string | null;
  contentType: ContentType;
  /** لمن نُسب القول إن كان قول عالم، مثل: «الشيخ ربيع» */
  speaker?: string | null;
  /** المرجع المكتوب على البطاقة، مثل: «مجموع الفتاوى 14/349» — يُعرض ولا يُعتمد */
  citedRef?: string | null;
  /** هل استُخدم النموذج اللغوي في الاستخراج */
  aiAssisted: boolean;
}

export type MatchLevel =
  | 'exact'
  | 'normalized_exact'
  | 'phrase'
  | 'fuzzy'
  | 'none';

/**
 * نتيجة المطابقة النصية.
 * similarity تقيس تشابه النص فقط (0..1) ولا تمثل بأي حال درجة صحة الحديث.
 */
export interface TextMatch {
  record: SourceRecord;
  level: MatchLevel;
  /** درجة تشابه النص فقط — ليست درجة صحة الحديث */
  similarity: number;
  /** هل النص المدخل جزء من نص المصدر */
  isPartOfSource: boolean;
}

export type DiffOp = 'equal' | 'added' | 'removed';

export interface DiffToken {
  op: DiffOp;
  text: string;
}

export interface TextDiff {
  /** النص المتداول مع تعليم الكلمات المضافة */
  circulating: DiffToken[];
  /** النص الموثق مع تعليم الكلمات المحذوفة من النص المتداول */
  source: DiffToken[];
  addedCount: number;
  removedCount: number;
  /** نسبة اختلاف الصياغة في النص المتداول — فرق نصي فقط */
  differencePercent: number;
}

export type ResultStatus =
  | 'verified_match'
  | 'wording_variant'
  | 'not_found'
  | 'needs_review'
  | 'source_unavailable';

/** خطوة في مسار الدليل، برمز قابل للترجمة ومعطيات تُعرض كما هي */
export type EvidenceCode =
  | 'ocr_done'
  | 'normalized'
  | 'phrase_identified'
  | 'provider_failed'
  | 'searched'
  | 'found'
  | 'best_match'
  | 'grade_quoted'
  | 'no_grade'
  | 'unavailable'
  | 'nothing_to_search'
  | 'not_hadith';

export interface EvidenceStep {
  code: EvidenceCode;
  params?: Record<string, string | number | boolean>;
}

export interface ScholarRuling {
  narrator: string;
  scholar: string;
  source: string;
  reference: string;
  grade: string;
  source_url: string;
}

export interface VerificationResult {
  status: ResultStatus;
  extraction: ExtractionResult;
  best: TextMatch | null;
  diff: TextDiff | null;
  /** أحكام المحدثين على الروايات المطابقة نصيًا، منقولة من المصدر */
  otherRulings: ScholarRuling[];
  rulingsDiffer: boolean;
  candidatesCount: number;
  provider: { id: string; live: boolean; fallbackUsed: boolean };
  evidence: EvidenceStep[];
  searchUrl: string;
  checkedAt: string;
}
