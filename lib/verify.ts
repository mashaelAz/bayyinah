import { extractSearchText } from './arabic/extract.ts';
import { normalizeArabic, stripDiacritics, tokenize } from './arabic/normalize.ts';
import { matchHadithText } from './matching/engine.ts';
import { diffTexts } from './matching/diff.ts';
import { extractSourceGrade, gradeTone } from './grades.ts';
import { ProviderUnavailableError, dorarSearchUrl, type HadithProvider } from './providers/types.ts';
import { matchableSourceText } from './display.ts';
import { quranQueryText } from './arabic/quranText.ts';
import type {
  QuranMatch,
  EvidenceStep,
  ExtractionResult,
  ResultStatus,
  ScholarRuling,
  SourceRecord,
  TextMatch,
  VerificationResult,
} from './types.ts';

/** حدود قرارات الحالة — مبنية على تشابه النص فقط، لا على صحة الحديث */
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
  /** تُجرَّب بالترتيب حتى ينجح أحدها */
  providers: HadithProvider[];
  assist?: (base: ExtractionResult) => Promise<ExtractionResult>;
  /** البحث في المصحف الشريف؛ يرمي خطأ إذا تعذّر */
  quran?: (text: string) => Promise<QuranMatch | null>;
}

/** نص صالح لمحرك البحث في المصدر: بلا تشكيل ولا علامات، مع الإبقاء على صور الحروف */
export function toSourceQuery(text: string): string {
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
  // بلا راوٍ معروف لا نستطيع الجزم بأنها الرواية نفسها، فلا نعدّها اختلافًا
  if (!narrator.replace(/[[\]\s]/g, '')) return false;
  const key = narratorKey(narrator);
  const tones = new Set(rulings.filter((r) => narratorKey(r.narrator) === key).map((r) => gradeTone(r.grade)));
  return tones.has('strong') && tones.has('weak');
}

/**
 * إذا تقارب التطابق بين كتب متعددة من الكتب الستة، نقدّم الصحيحين،
 * لأن الحديث إذا كان فيهما فهو من الصحيح المعتمد.
 */
function preferSahihayn(matches: TextMatch[]): TextMatch[] {
  const top = matches[0];
  // لا نعيد ترتيب نتائج الدرر المباشرة؛ فقط النسخ المحفوظة والكتب الستة
  if (!top || top.record.provider !== 'demo-dorar') return matches;
  const strong = (m: TextMatch) => m.isPartOfSource || m.similarity >= top.similarity - 0.03;
  const sahih = matches.find(
    (m) => /^book-[bm]-/.test(m.record.id) && strong(m) && (m.isPartOfSource || !top.isPartOfSource),
  );
  if (!sahih || sahih === top) return matches;
  return [sahih, ...matches.filter((m) => m !== sahih)];
}

export async function verifyText(input: VerifyInput, deps: VerifyDeps): Promise<VerificationResult> {
  const evidence: EvidenceStep[] = [];
  let extraction = extractSearchText(input.text, input.extractedText ?? '');

  if (input.fromImage) evidence.push({ code: 'ocr_done' });
  if (deps.assist) extraction = await deps.assist(extraction);
  evidence.push({ code: 'normalized' });
  evidence.push({
    code: 'phrase_identified',
    params: {
      attribution: extraction.attribution ?? '',
      extras: extraction.extraPhrases.length,
      ai: extraction.aiAssisted,
    },
  });

  const checkedAt = new Date().toISOString();
  const empty = {
    extraction,
    best: null,
    diff: null,
    otherRulings: [],
    rulingsDiffer: false,
    candidatesCount: 0,
    checkedAt,
  };
  const firstId = deps.providers[0]?.id ?? 'none';

  if (tokenize(extraction.normalizedSearchText).length === 0) {
    evidence.push({ code: 'nothing_to_search' });
    return {
      ...empty,
      status: 'not_found',
      provider: { id: firstId, live: true, fallbackUsed: false },
      evidence,
      searchUrl: dorarSearchUrl(''),
    };
  }

  // قول منسوب إلى عالم: ليس حديثًا، والموسوعة الحديثية لا تحكم على أقوال العلماء
  if (extraction.contentType === 'saying') {
    evidence.push({ code: 'not_hadith', params: { speaker: extraction.speaker ?? '', ref: extraction.citedRef ?? '' } });
    return {
      ...empty,
      status: 'not_found',
      provider: { id: firstId, live: true, fallbackUsed: false },
      evidence,
      searchUrl: dorarSearchUrl(''),
    };
  }

  // نص يُقدَّم على أنه آية: نتحقق منه في المصحف الشريف
  if (extraction.contentType === 'quran' && deps.quran) {
    try {
      const qm = await deps.quran(extraction.originalText);
      return quranResult(qm, false);
    } catch {
      /* تعذّر المصحف: نكمل بالمسار المعتاد */
    }
  }

  function quranResult(qm: QuranMatch | null, misattributed: boolean): VerificationResult {
    evidence.push(
      qm
        ? { code: 'quran_found', params: { surah: qm.surahName, ayah: qm.from === qm.to ? `${qm.from}` : `${qm.from}–${qm.to}` } }
        : { code: 'quran_missing' },
    );
    const status: ResultStatus = qm ? (qm.exact ? 'verified_match' : 'wording_variant') : 'not_found';
    return {
      ...empty,
      status,
      diff: qm && !qm.exact ? diffTexts(quranQueryText(extraction.originalText), qm.excerpt ?? qm.plain) : null,
      quran: qm,
      quranMisattributed: misattributed,
      provider: { id: 'quran', live: false, fallbackUsed: false },
      evidence,
      searchUrl: qm?.url ?? 'https://quran.com',
    };
  }

  const query = toSourceQuery(extraction.searchText);
  let records: SourceRecord[] | null = null;
  let searchUrl = dorarSearchUrl(query);
  let used: HadithProvider | null = null;
  let anyLiveFailed = false;
  let lastReason = '';
  let coverage: 'six_books' | undefined;

  for (const provider of deps.providers) {
    try {
      const res = await provider.searchHadithSources(query);
      records = res.records;
      searchUrl = res.searchUrl;
      coverage = res.coverage;
      used = provider;
      break;
    } catch (err) {
      const reason = err instanceof ProviderUnavailableError ? err.message : 'error';
      lastReason = reason;
      if (provider.live) anyLiveFailed = true;
      evidence.push({ code: 'provider_failed', params: { provider: provider.id, reason } });
    }
  }

  if (!used || !records) {
    evidence.push({ code: 'unavailable', params: { reason: lastReason } });
    return {
      ...empty,
      status: 'source_unavailable',
      provider: { id: firstId, live: true, fallbackUsed: false },
      evidence,
      searchUrl,
    };
  }

  const fallbackUsed = !used.live && anyLiveFailed;
  evidence.push({ code: 'searched', params: { provider: used.id, query: query.split(' ').slice(0, 7).join(' ') } });
  evidence.push({ code: 'found', params: { count: records.length } });

  const matches = preferSahihayn(matchHadithText(extraction.searchText, extraction.normalizedSearchText, records));
  const top = matches[0] ?? null;
  let status = decideStatus(top);

  // لا نقول «لم نعثر» اعتمادًا على نسخة مخزنة محدودة؛ نصرّح بتعذر المصدر بدلًا من ذلك.
  // أما إذا بُحث في الكتب الستة كاملة فالنتيجة «لم يرد بهذا اللفظ في الكتب الستة» نتيجة صحيحة ومفيدة.
  if (fallbackUsed && status === 'not_found' && coverage !== 'six_books') status = 'source_unavailable';
  if (coverage === 'six_books' && status === 'not_found') evidence.push({ code: 'six_books' });

  const best = status === 'not_found' || status === 'source_unavailable' ? null : top;
  if (best) {
    evidence.push({ code: 'best_match', params: { level: best.level, pct: Math.round(best.similarity * 100) } });
  }

  // جزء قصير من رواية أطول ضُعّفت كاملةً: الحكم يخص الرواية كلها، فلا نطلقه على الجزء
  const partOfLonger = Boolean(
    best &&
      best.isPartOfSource &&
      gradeTone(extractSourceGrade(best.record)) === 'weak' &&
      tokenize(extraction.normalizedSearchText).length < 0.6 * tokenize(normalizeArabic(matchableSourceText(best.record.text))).length,
  );
  if (partOfLonger) status = 'needs_review';

  const otherRulings = best ? collectRulings(matches, best) : [];
  const rulingsDiffer = best ? rulingsConflictForNarrator(otherRulings, best.record.narrator) : false;
  if (best && rulingsDiffer) status = 'needs_review';

  const diff =
    best && !best.isPartOfSource && best.level !== 'exact' && best.level !== 'normalized_exact'
      ? diffTexts(extraction.searchText, matchableSourceText(best.record.text))
      : null;

  if (best) {
    const grade = extractSourceGrade(best.record);
    evidence.push(
      grade
        ? {
            code: 'grade_quoted',
            params: { grade, scholar: best.record.scholar, source: best.record.source, ref: best.record.reference },
          }
        : { code: 'no_grade' },
    );
  }
  if (status === 'source_unavailable') evidence.push({ code: 'unavailable', params: { reason: lastReason } });

  // لم نجد حديثًا: هل النص آية قرآنية نُسبت إلى النبي ﷺ؟
  if (!best && deps.quran && tokenize(extraction.normalizedSearchText).length >= 4) {
    try {
      const qm = await deps.quran(extraction.searchText);
      if (qm?.exact) return quranResult(qm, extraction.contentType === 'hadith');
    } catch {
      /* نكمل بنتيجة الحديث */
    }
  }

  return {
    status,
    extraction,
    best,
    diff,
    otherRulings,
    rulingsDiffer,
    partOfLonger,
    candidatesCount: records.length,
    provider: { id: used.id, live: used.live, fallbackUsed, coverage },
    evidence,
    searchUrl,
    checkedAt,
  };
}
