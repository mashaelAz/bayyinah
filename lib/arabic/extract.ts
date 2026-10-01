import { normalizeArabic, tokenize } from './normalize.ts';
import type { ContentType, ExtractionResult } from '../types.ts';

/**
 * أنماط العبارات الدعوية الإضافية التي تُلحق بالبطاقات وليست جزءًا من النص المراد مطابقته.
 * تُطابق على النص المطبّع، ولا تُعتبر إضافة إلا إذا كانت مقطعًا قصيرًا مستقلًا،
 * حتى لا نحذف خطأً كلمات من متن حديث (مثل: «إلا من صدقة جارية»).
 */
const DAWAH_PATTERNS: RegExp[] = [
  /^(انشر|انشرها|انشروها|شارك|شاركها|ساهم في نشر)/,
  /توجر|ولك الاجر|لك الاجر|في ميزان حسناتك/,
  /لا تجعلها تقف عندك|لا توقفها عندك|لا تدعها تقف/,
  /^(ارسلها|ارسلوها|ابعثها|انقلها)/,
  /لعشره اشخاص|لكل من تعرف|لكل من تحب|لمن تحب/,
  /^صدقه جاريه( لي| عني| عن| لوالدي| لامي| لابي| للمرحوم| للمرحومه)/,
  /^(اللهم اجعلها|اجعلها) صدقه/,
  /^(سبحان الله وبحمده سبحان الله العظيم)$/, // ذكر مستقل يُلحق أحيانًا
  /^(لا اله الا الله|اللهم صل على محمد)$/,
  /(تابعونا|تابعوا|حسابنا|قناتنا|رابط القناه)/,
  // إشارة المصدر المكتوبة على البطاقة، مثل: «صحيح الترمذي 2546» — نتحقق منها بالبحث لا نعتمدها
  /^(صحيح|ضعيف|سنن|رواه|اخرجه|متفق عليه|مسند|جامع|السلسله)( |$)/,
];

/** صيغ نسبة القول إلى النبي ﷺ، تُفصل عن المتن عند البحث وتُعرض للشفافية */
const ATTRIBUTION_RE =
  /^\s*((?:عن\s+\S+(?:\s+\S+){0,3}\s+(?:رضي\s+الله\s+عنه(?:ا|م|ما)?\s+)?)?(?:قال|يقول|أن|ان)\s+(?:رسول\s+الله|النبي|النبيّ|نبي\s+الله)\s*(?:ﷺ|صلى\s+الله\s+عليه\s+وسلم|صلّى\s+الله\s+عليه\s+وسلّم|عليه\s+الصلاة\s+والسلام)?\s*(?:قال)?\s*[:：،,]?\s*)/u;

/** بدايات العبارات الدعوية حين تلتصق بآخر المتن */
const DAWAH_START =
  /^(و)?(انشر|انشرها|انشروها|شارك|شاركها|ارسلها|ارسلوها|ابعثها|لا تجعلها|لا توقفها|صدقه جاريه|اللهم اجعلها|تابعونا|صحيح |رواه |اخرجه |متفق عليه)/;

const SEGMENT_SPLIT = /\n+|\s[—–\-|•]\s|[.!؟?](?=\s|$)/;

function isDawahSegment(segment: string, standalone = false): boolean {
  const n = normalizeArabic(segment);
  if (!n) return false;
  // «صدقة جارية» وحدها سطرًا مستقلًا تُعدّ إضافة، أما في آخر المتن فقد تكون من الحديث نفسه
  if (standalone && n === 'صدقه جاريه') return true;
  const words = tokenize(n).length;
  if (words > 9) return false;
  return DAWAH_PATTERNS.some((p) => p.test(n));
}

function extractQuoted(text: string): string | null {
  const m = text.match(/[«"“]([^«»"“”]{6,})[»"”]/);
  if (!m) return null;
  return tokenize(normalizeArabic(m[1])).length >= 3 ? m[1].trim() : null;
}

export function classifyText(text: string, attribution: string | null): ContentType {
  const n = normalizeArabic(text);
  if (/﴿|﴾/.test(text) || /^(قال تعالي|قال الله تعالي|بسم الله الرحمن الرحيم)/.test(n)) {
    return 'quran';
  }
  if (attribution || /ﷺ|صلى الله عليه وسلم|رسول الله|قال النبي/.test(text)) {
    return 'hadith';
  }
  if (/^(عن|قال) (عمر|علي|ابي بكر|عثمان|ابن عباس|ابن مسعود|ابن عمر|عايشه)\b/.test(n) &&
      /رضي الله عن/.test(n)) {
    return 'athar';
  }
  if (/^(اللهم|ربنا|رب )/.test(n)) return 'dua';
  if (/^(قال|يقول) (الامام|الشيخ|ابن القيم|ابن تيميه|الحسن البصري|الشافعي|احمد)/.test(n)) {
    return 'saying';
  }
  return 'unknown';
}

/**
 * يفصل الجزء المراد التحقق منه عن العبارات الدعوية الإضافية وصيغ النسبة.
 * لا يحذف أي شيء من النص الأصلي المعروض؛ يُنتج نسخة بحث منفصلة.
 */
export function extractSearchText(originalText: string, extractedText = ''): ExtractionResult {
  const original = originalText.trim();
  const extraPhrases: string[] = [];

  const segments = original
    .split(SEGMENT_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);

  const kept: string[] = [];
  for (const seg of segments) {
    if (isDawahSegment(seg, true)) {
      extraPhrases.push(seg);
      continue;
    }
    // عبارة دعوية ملتصقة بآخر المقطع دون فاصل، مثل: «... ما نوى انشر تؤجر»
    const words = seg.split(/\s+/);
    let split = false;
    for (let i = Math.max(3, words.length - 8); i <= words.length - 2; i++) {
      const tail = words.slice(i).join(' ');
      if (DAWAH_START.test(normalizeArabic(tail)) && isDawahSegment(tail)) {
        kept.push(words.slice(0, i).join(' '));
        extraPhrases.push(tail);
        split = true;
        break;
      }
    }
    if (!split) kept.push(seg);
  }

  let body = kept.join(' ').trim();
  const quoted = extractQuoted(body);

  let attribution: string | null = null;
  const am = body.match(ATTRIBUTION_RE);
  if (am && am[1].trim().length > 0) {
    attribution = am[1].trim().replace(/[:：،,]\s*$/, '');
    body = body.slice(am[0].length).trim();
  }

  let searchText = quoted ?? body;
  // إزالة علامات التنصيص الطرفية
  searchText = searchText.replace(/^[«"“\s]+|[»"”\s]+$/g, '').trim();
  if (!searchText) searchText = original;

  const contentType =
    tokenize(normalizeArabic(searchText)).length === 0 && extraPhrases.length > 0
      ? 'dawah_phrase'
      : classifyText(original, attribution);

  return {
    originalText: original,
    extractedText,
    searchText,
    normalizedSearchText: normalizeArabic(searchText),
    extraPhrases,
    attribution,
    contentType,
    aiAssisted: false,
  };
}
