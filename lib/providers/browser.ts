import { parseDorarResponse } from './dorarParser.ts';
import { ProviderUnavailableError, searchInStages, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * الاتصال بالدرر السنية من متصفح المستخدم مباشرة (JSONP).
 *
 * الخدمة العامة dorar_api.json تدعم المعامل callback، فتعيد النتيجة ملفوفة باسم دالة.
 * الطلب يخرج من شبكة المستخدم نفسها كما لو فتح الدرر في المتصفح،
 * فلا يتأثر بحجب الطلبات الآلية من الخوادم، ويعمل على أي استضافة.
 */

const TIMEOUT_MS = 15000;
let counter = 0;

function jsonp(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new ProviderUnavailableError('no_browser'));
      return;
    }
    const name = `__bayyinah_cb_${Date.now()}_${counter++}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      done = true;
      clearTimeout(timer);
      script.remove();
      // نترك دالة فارغة بدل الحذف، حتى لا يفشل ردّ متأخر
      w[name] = () => undefined;
    };
    const timer = setTimeout(() => {
      if (done) return;
      cleanup();
      reject(new ProviderUnavailableError('timeout'));
    }, TIMEOUT_MS);

    w[name] = (data: unknown) => {
      if (done) return;
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      if (done) return;
      cleanup();
      reject(new ProviderUnavailableError('script_blocked'));
    };
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${name}`;
    document.head.appendChild(script);
  });
}

export class BrowserDorarProvider implements HadithProvider {
  id = 'dorar-browser';
  live = true;

  private readonly baseUrl: string;
  private readonly cache = new Map<string, SourceRecord[]>();

  constructor(baseUrl = 'https://dorar.net/dorar_api.json') {
    this.baseUrl = baseUrl;
  }

  private async fetchOnce(query: string): Promise<SourceRecord[]> {
    const key = query.trim();
    const hit = this.cache.get(key);
    if (hit) return hit;
    const url = `${this.baseUrl}?skey=${encodeURIComponent(key)}`;
    let data: unknown;
    try {
      data = await jsonp(url);
    } catch {
      // إعادة محاولة واحدة: الشبكة أو الموسوعة قد تتأخر لحظيًا
      await new Promise((r) => setTimeout(r, 800));
      data = await jsonp(url);
    }
    let records: SourceRecord[];
    try {
      records = parseDorarResponse(data, key, new Date().toISOString());
    } catch {
      throw new ProviderUnavailableError('bad_format');
    }
    this.cache.set(key, records);
    return records;
  }

  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    return searchInStages(query, (q) => this.fetchOnce(q));
  }
}

/** الاتصال بالدرر عبر خادم بيّنة (/api/dorar) — طريق احتياطي إذا حُجب الطلب من المتصفح */
export class ServerDorarProvider implements HadithProvider {
  id = 'dorar-server';
  live = true;

  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`/api/dorar?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || !Array.isArray(body.records)) {
        throw new ProviderUnavailableError(body?.reason || `http_${res.status}`);
      }
      return body as ProviderSearchResult;
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      throw new ProviderUnavailableError((err as Error).name === 'AbortError' ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
  }
}
