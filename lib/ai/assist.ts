import { normalizeArabic, tokenize } from '../arabic/normalize.ts';
import { coverage } from '../matching/similarity.ts';
import type { ContentType, ExtractionResult } from '../types.ts';

/**
 * مساعد اختياري بنموذج لغوي لفهم النص وفصل المتن عن الإضافات.
 *
 * حدود صارمة:
 * - لا يُطلب منه ولا يُقبل منه أي حكم على الحديث.
 * - مخرجاته تُقبل فقط إذا كانت كلمات «المتن» المقترح موجودة فعلًا في النص المدخل
 *   (حماية من الهلوسة: لا يمكنه إضافة لفظ لم يكتبه المستخدم).
 * - عند أي فشل أو مهلة يُستخدم الاستخراج بالقواعد.
 */

const SYSTEM_PROMPT = `أنت أداة تحليل نصي فقط. مهمتك فصل النص المنسوب أو المتن عن العبارات الدعوية الإضافية في بطاقة متداولة.
القواعد:
- لا تحكم أبدًا على صحة أي حديث ولا تذكر درجته.
- لا تضف أي كلمة غير موجودة في النص. انسخ المتن حرفيًا من النص المعطى.
- لا تنسب النص إلى النبي ﷺ إلا إذا كانت النسبة مكتوبة صراحة في النص.
أعد JSON فقط بهذا الشكل:
{"main_text": "...", "extra_phrases": ["..."], "attribution": "..." أو null, "type": "hadith|quran|dua|athar|saying|dawah_phrase|unknown"}`;

const TYPES: ContentType[] = ['hadith', 'quran', 'dua', 'athar', 'saying', 'dawah_phrase', 'unknown'];

export function isAiAssistEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function aiAssistExtraction(base: ExtractionResult): Promise<ExtractionResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return base;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: base.originalText }],
      }),
    });
    if (!res.ok) return base;
    const body = await res.json();
    const raw: string = body?.content?.[0]?.text ?? '';
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));

    const main = String(json.main_text || '').trim();
    const mainTokens = tokenize(normalizeArabic(main));
    const inputTokens = tokenize(normalizeArabic(base.originalText));
    // حماية من الهلوسة: يجب أن يكون المتن المقترح مأخوذًا من النص المدخل نفسه
    if (mainTokens.length < 2 || coverage(mainTokens, inputTokens) < 0.95) return base;

    const extras = Array.isArray(json.extra_phrases)
      ? json.extra_phrases.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    const type = TYPES.includes(json.type) ? (json.type as ContentType) : base.contentType;
    // لا نقبل تصنيفه حديثًا إلا إذا كانت النسبة مكتوبة صراحة (وجدها الاستخراج بالقواعد)
    const safeType = type === 'hadith' && !base.attribution && base.contentType !== 'hadith' ? 'unknown' : type;

    return {
      ...base,
      searchText: main,
      normalizedSearchText: normalizeArabic(main),
      extraPhrases: Array.from(new Set([...base.extraPhrases, ...extras])),
      contentType: safeType,
      aiAssisted: true,
    };
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}
