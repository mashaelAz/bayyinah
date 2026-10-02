import { parseDorarResponse } from './dorarParser.ts';
import { ProviderUnavailableError, searchInStages, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * مزوّد الدرر السنية — الموسوعة الحديثية (اتصال مباشر من الخادم).
 * يستخدم الواجهة العامة المعلنة في خدمات الموقع التقنية: dorar_api.json?skey=
 * الرابط قابل للتغيير عبر DORAR_API_URL، ولا يُفترض أي مفتاح غير موجود.
 */

const CACHE = new Map<string, { at: number; records: SourceRecord[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const TIMEOUT_MS = 12000;

/** ترويسات متصفح عادية: بعض الخوادم ترفض الطلبات التي لا تبدو من متصفح */
const HEADERS: Record<string, string> = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ar,en;q=0.8',
  Referer: 'https://dorar.net/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

export class DorarProvider implements HadithProvider {
  id = 'dorar-server';
  live = true;

  private readonly baseUrl: string;

  constructor(baseUrl = process.env.DORAR_API_URL || 'https://dorar.net/dorar_api.json') {
    this.baseUrl = baseUrl;
  }

  async fetchOnce(query: string): Promise<SourceRecord[]> {
    const key = query.trim();
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.records;

    const url = `${this.baseUrl}?skey=${encodeURIComponent(key)}`;
    let lastError = 'network';
    // محاولتان: أعطال الشبكة العابرة شائعة
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: HEADERS, cache: 'no-store' });
        if (!res.ok) {
          lastError = `http_${res.status}`;
          continue;
        }
        const body = await res.text();
        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch {
          lastError = 'bad_format';
          continue;
        }
        const records = parseDorarResponse(json, key, new Date().toISOString());
        CACHE.set(key, { at: Date.now(), records });
        return records;
      } catch (err) {
        const e = err as Error & { cause?: { code?: string } };
        lastError = e.name === 'AbortError' ? 'timeout' : `network${e.cause?.code ? `:${e.cause.code}` : ''}`;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new ProviderUnavailableError(lastError);
  }

  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    return searchInStages(query, (q) => this.fetchOnce(q));
  }
}
