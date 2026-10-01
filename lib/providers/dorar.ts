import { parseDorarResponse } from './dorarParser.ts';
import { dorarSearchUrl, ProviderUnavailableError, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * مزوّد الدرر السنية — الموسوعة الحديثية (اتصال مباشر من الخادم).
 * يستخدم الواجهة العامة المعلنة في خدمات الموقع التقنية: dorar_api.json?skey=
 * الرابط قابل للتغيير عبر DORAR_API_URL، ولا يُفترض أي مفتاح غير موجود.
 */

const CACHE = new Map<string, { at: number; records: SourceRecord[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const TIMEOUT_MS = 8000;

export class DorarProvider implements HadithProvider {
  id = 'dorar';
  name = 'الدرر السنية — الموسوعة الحديثية';
  live = true;

  private readonly baseUrl: string;

  constructor(baseUrl = process.env.DORAR_API_URL || 'https://dorar.net/dorar_api.json') {
    this.baseUrl = baseUrl;
  }

  private async fetchOnce(query: string): Promise<SourceRecord[]> {
    const key = query.trim();
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.records;

    const url = `${this.baseUrl}?skey=${encodeURIComponent(key)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'Tathabbat/0.1 (hackathon prototype)' },
        cache: 'no-store',
      });
      if (!res.ok) throw new ProviderUnavailableError(`HTTP ${res.status}`);
      const json = await res.json();
      const records = parseDorarResponse(json, key, new Date().toISOString());
      CACHE.set(key, { at: Date.now(), records });
      return records;
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      throw new ProviderUnavailableError((err as Error).message || 'تعذر الاتصال');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * بحث على مرحلتين: بأول كلمات النص (محرك البحث في المصدر يعمل أفضل بعبارة قصيرة مميزة)،
   * ثم بمقطع أوسط إذا لم تظهر نتائج — مفيد حين تكون بداية النص المتداول محرّفة.
   */
  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    const words = query.split(/\s+/).filter(Boolean);
    const attempts: string[] = [];
    attempts.push(words.slice(0, 7).join(' '));
    if (words.length > 8) {
      const mid = Math.floor(words.length / 2);
      attempts.push(words.slice(Math.max(0, mid - 3), mid + 3).join(' '));
    }

    const seen = new Map<string, SourceRecord>();
    let lastQuery = attempts[0];
    for (const q of attempts) {
      lastQuery = q;
      const records = await this.fetchOnce(q);
      for (const r of records) seen.set(r.id, r);
      if (seen.size >= 5) break;
    }
    return { records: [...seen.values()], searchUrl: dorarSearchUrl(lastQuery) };
  }
}
