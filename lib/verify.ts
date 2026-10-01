import { extractSearchText } from './arabic/extract.ts';
import { normalizeArabic, stripDiacritics, tokenize } from './arabic/normalize.ts';
import { matchHadithText } from './matching/engine.ts';
import { diffTexts } from './matching/diff.ts';
import { extractSourceGrade, gradeTone } from './grades.ts';
import { ProviderUnavailableError, dorarSearchUrl } from './providers/types.ts';
import { levelLabel, matchableSourceText } from './display.ts';
export { levelLabel, matchableSourceText };
import type { ProviderChain } from './providers/index.ts';
import type {
  EvidenceStep,
  ExtractionResult,
  ResultStatus,
  ScholarRuling,
  TextMatch,
  VerificationResult,
} from './types.ts';

/** حدود قرارات الحالة — مبنية على تشابه النص فقط */
export const THRESHOLDS = {
  verified: 0.92,
  variant: 0.6,
  review: 0.45,
} as const;

export interface VerifyInput {
  text: string;
  extractedText?: string;
  fromImage?: boolean;
}

export interface VerifyDeps {
  providers: ProviderChain;
  assist?: (base: ExtractionResult) => Promise<ExtractionResult>;
}

/** نص صالح لمحرك البحث في المصدر: بلا تشكيل ولا علامات، مع الإبقاء على صور الحروف */
function toSourceQuery(text: string): string {
  return stripDiacritics(text)
    .replace(/ﷺ/g, ' ')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decideStatus(best: TextMatch | null): ResultStatus {
  if (!best) return 'not_found';
  if (best.level === 'exact' || best.level === 'normalized_exact' || best.isPartOfSource) {
    return 'verified_match';
  }
  if (best.similarity >= THRESHOLDS.verified) return 'verified_match';
  if (best.similarity >= THRESHOLDS.variant) return 'wording_variant';
  if (best.similarity >= THRESHOLDS.review) return 'needs_review';
  return 'not_found';
}

function narratorKey(n: string): string {
  return normalizeArabic(n.replace(/[[\]]/g, '')) || '—';
}

function collectRulings(matches: TextMatch[], best: TextMatch): ScholarRuling[] {
  const floor = best.isPartOfSource ? 0.98 : Math.max(THRESHOLDS.variant, best.similarity - 0.12);
  const seen = new Set<string>();
  const out: ScholarRuling[] = [];
  for (const m of matches) {
    if (m.similarity < floor && !(best.isPartOfSource && m.isPartOfSource)) continue;
    const grade = extractSourceGrade(m.record);
    if (!grade) continue;
    const key = `${m.record.scholar}|${m.record.source}|${m.record.reference}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      narrator: m.record.narrator,
      scholar: m.record.scholar,
      source: m.record.source,
      reference: m.record.reference,
      grade,
      source_url: m.record.source_url,
    });
    if (out.length >= 8) break;
  }
  return out;
}

/** هل اختلفت أحكام المحدثين على رواية الراوي نفسه بين تقوية وتضعيف؟ */
function rulingsConflictForNarrator(rulings: ScholarRuling[], narrator: string): boolean {
  const key = narratorKey(narrator);
  const tones = new Set(rulings.filter((r) => narratorKey(r.narrator) === key).map((r) => gradeTone(r.grade)));
  return tones.has('strong') && tones.has('weak');
}

/** شرح مبسّط للنتيجة. يصف ما وجده النظام ولا يضيف حكمًا من عنده. */
export function explainResult(r: Pick<VerificationResult, 'status' | 'best' | 'diff' | 'extraction' | 'rulingsDiffer'>): string {
  const grade = r.best ? extractSourceGrade(r.best.record) : null;
  const who = r.best ? `${r.best.record.scholar}${r.best.record.source ? ` في «${r.best.record.source}»` : ''}` : '';
  switch (r.status) {
    case 'verified_match':
      return r.best?.isPartOfSource
        ? `النص الذي أدخلته جزء من رواية موجودة في المصدر.${grade ? ` وحكم ${who} عليها: «${grade}».` : ' ولم يذكر المصدر حكمًا لهذه الرواية.'}`
        : `وجدنا نصًا مطابقًا في المصدر.${grade ? ` وحكم ${who} عليه: «${grade}».` : ' ولم يذكر المصدر حكمًا لهذه الرواية.'}`;
    case 'wording_variant':
      return `وجدنا رواية قريبة في المصدر، لكن ألفاظ النص المتداول تختلف عنها${r.diff ? ` (أُضيفت أو تغيّرت ${r.diff.addedCount} كلمة، وسقطت ${r.diff.removedCount})` : ''}. الحكم المنقول يخص لفظ المصدر، لا الصيغة المتداولة.`;
    case 'needs_review':
      return r.rulingsDiffer
        ? 'اختلفت أحكام المحدثين على هذه الرواية في المصدر، فلا نعرض نتيجة واحدة آليًا. راجع الأحكام أدناه أو أهل الاختصاص.'
        : 'وجدنا نتائج متقاربة جزئيًا فقط، ولا تكفي لإعطاء نتيجة موثقة آليًا. راجع المصدر أو أهل الاختصاص قبل إعادة النشر.';
    case 'not_found':
      return 'لم نعثر على نتيجة موثقة مطابقة لهذا اللفظ في المصادر المتاحة. وهذا لا يعني تلقائيًا أن النص موضوع.';
    case 'source_unavailable':
      return 'تعذر الوصول إلى مصدر التحقق حاليًا. لم نصدر نتيجة غير موثقة.';
  }
}

export async function verifyText(input: VerifyInput, deps: VerifyDeps): Promise<VerificationResult> {
  const evidence: EvidenceStep[] = [];
  let extraction = extractSearchText(input.text, input.extractedText ?? '');

  if (input.fromImage) {
    evidence.push({ label: 'تم استخراج النص من الصورة', detail: 'بتقنية التعرف الضوئي على الحروف، مع إتاحة تصحيحه قبل البحث' });
  }
  if (deps.assist) {
    extraction = await deps.assist(extraction);
  }
  evidence.push({ label: 'تم تنظيف النص لأغراض البحث', detail: 'إزالة التشكيل والتطويل وتوحيد صور الحروف، دون تعديل النص المعروض' });
  evidence.push({
    label: 'تم تحديد العبارة المحتملة',
    detail: [
      extraction.attribution ? `فُصلت صيغة النسبة: «${extraction.attribution}»` : null,
      extraction.extraPhrases.length ? `استُبعدت ${extraction.extraPhrases.length} عبارة إضافية من البحث` : null,
      extraction.aiAssisted ? 'بمساعدة نموذج لغوي (للفصل فقط، دون أي حكم)' : 'بالقواعد اللغوية',
    ]
      .filter(Boolean)
      .join('، '),
  });

  const checkedAt = new Date().toISOString();
  const base = {
    extraction,
    best: null,
    diff: null,
    otherRulings: [],
    rulingsDiffer: false,
    candidatesCount: 0,
    checkedAt,
  };

  if (tokenize(extraction.normalizedSearchText).length === 0) {
    const r = { ...base, status: 'not_found' as const };
    return {
      ...r,
      provider: { id: deps.providers.primary.id, name: deps.providers.primary.name, live: deps.providers.primary.live, fallbackUsed: false },
      evidence,
      explanation: 'لم نجد نصًا قابلًا للبحث بعد استبعاد العبارات الإضافية.',
      searchUrl: dorarSearchUrl(''),
    };
  }

  const query = toSourceQuery(extraction.searchText);
  let provider = deps.providers.primary;
  let fallbackUsed = false;
  let records;
  let searchUrl = dorarSearchUrl(query);

  try {
    const res = await provider.searchHadithSources(query);
    records = res.records;
    searchUrl = res.searchUrl;
  } catch (err) {
    if (!(err instanceof ProviderUnavailableError) || !deps.providers.fallback) {
      evidence.push({ label: 'تعذر الوصول إلى المصدر', detail: (err as Error).message });
      return {
        ...base,
        status: 'source_unavailable',
        provider: { id: provider.id, name: provider.name, live: provider.live, fallbackUsed: false },
        evidence,
        explanation: explainResult({ ...base, status: 'source_unavailable' }),
        searchUrl,
      };
    }
    evidence.push({ label: 'تعذر الاتصال المباشر بالمصدر', detail: 'استُخدمت النسخة المخزنة الموثقة' });
    provider = deps.providers.fallback;
    fallbackUsed = true;
    const res = await provider.searchHadithSources(query);
    records = res.records;
    searchUrl = res.searchUrl;
  }

  evidence.push({ label: `تم البحث في: ${provider.name}`, detail: `عبارة البحث: «${query.split(' ').slice(0, 7).join(' ')}»` });
  evidence.push({ label: `تم العثور على ${records.length} نتيجة` });

  const matches = matchHadithText(extraction.searchText, extraction.normalizedSearchText, records);
  const top = matches[0] ?? null;
  let status = decideStatus(top);

  // لا نقول «لم نعثر» اعتمادًا على نسخة مخزنة محدودة؛ نصرّح بتعذر المصدر بدلًا من ذلك
  if (fallbackUsed && status === 'not_found') status = 'source_unavailable';

  const best = status === 'not_found' || status === 'source_unavailable' ? null : top;
  if (best) {
    evidence.push({
      label: 'تم اختيار أعلى تطابق نصي',
      detail: `مستوى المطابقة: ${levelLabel(best.level)} — تشابه النص ${Math.round(best.similarity * 100)}% (تشابه ألفاظ فقط، لا درجة صحة)`,
    });
  }

  const otherRulings = best ? collectRulings(matches, best) : [];
  const rulingsDiffer = best ? rulingsConflictForNarrator(otherRulings, best.record.narrator) : false;
  if (best && rulingsDiffer) status = 'needs_review';

  const diff =
    best && !best.isPartOfSource && best.level !== 'exact' && best.level !== 'normalized_exact'
      ? diffTexts(extraction.searchText, matchableSourceText(best.record.text))
      : null;

  if (best) {
    const grade = extractSourceGrade(best.record);
    evidence.push({
      label: grade ? 'تم نقل الحكم من المصدر الأصلي' : 'لم يذكر المصدر حكمًا لهذه الرواية',
      detail: grade ? `«${grade}» — ${best.record.scholar}، ${best.record.source} ${best.record.reference}` : undefined,
    });
  }

  const result: VerificationResult = {
    status,
    extraction,
    best,
    diff,
    otherRulings,
    rulingsDiffer,
    candidatesCount: records.length,
    provider: { id: provider.id, name: provider.name, live: provider.live, fallbackUsed },
    evidence,
    explanation: '',
    searchUrl,
    checkedAt,
  };
  result.explanation = explainResult(result);
  return result;
}
