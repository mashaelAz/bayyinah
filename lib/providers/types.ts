import type { SourceRecord } from '../types.ts';

export interface ProviderSearchResult {
  records: SourceRecord[];
  /** رابط صفحة البحث في المصدر نفسه، ليراجع المستخدم بنفسه */
  searchUrl: string;
  /** إذا بُحث في مجموعة كتب كاملة معروفة (مثل الكتب الستة)، يُذكر نطاقها هنا */
  coverage?: 'six_books';
}

/**
 * واجهة موحّدة لأي مصدر حديثي.
 * الواجهة لا تعرف أي مزوّد يعمل، فاستبدال المزوّد لا يغيّر التصميم.
 * id: dorar-browser | dorar-server | demo
 */
export interface HadithProvider {
  id: string;
  /** هل يجلب من المصدر مباشرة (true) أم من نسخة مخزنة (false) */
  live: boolean;
  searchHadithSources(query: string): Promise<ProviderSearchResult>;
}

/** رسالة الخطأ رمز تقني قصير: timeout | http_403 | bad_format | network | script_blocked */
export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

export function dorarSearchUrl(query: string): string {
  return `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}`;
}

/**
 * بحث على مرحلتين، مشترك بين طرق الاتصال بالدرر:
 * بأول سبع كلمات (محرك المصدر يعمل أفضل بعبارة قصيرة مميزة)،
 * ثم بمقطع أوسط إذا قلّت النتائج — مفيد حين تكون بداية النص المتداول محرّفة.
 */
export async function searchInStages(
  query: string,
  fetchOnce: (q: string) => Promise<SourceRecord[]>,
): Promise<ProviderSearchResult> {
  const words = query.split(/\s+/).filter(Boolean);
  const attempts: string[] = [words.slice(0, 7).join(' ')];
  if (words.length > 8) {
    const mid = Math.floor(words.length / 2);
    attempts.push(words.slice(Math.max(0, mid - 3), mid + 3).join(' '));
  }
  const seen = new Map<string, SourceRecord>();
  let ok = false;
  let lastErr: unknown = null;
  for (const q of attempts) {
    try {
      const records = await fetchOnce(q);
      ok = true;
      for (const r of records) seen.set(r.id, r);
      if (seen.size >= 5) break;
    } catch (err) {
      // محاولة واحدة فاشلة لا تُسقط البحث إذا نجحت غيرها
      lastErr = err;
    }
  }
  if (!ok) throw lastErr;
  return { records: [...seen.values()], searchUrl: dorarSearchUrl(attempts[0]) };
}
