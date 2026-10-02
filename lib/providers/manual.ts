import { parseDorarResponse } from './dorarParser.ts';
import { dorarSearchUrl, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * «جسر الدرر»: حين يرفض المصدر الطلبات الآلية، يفتح المستخدم صفحة نتائج الدرر بنفسه
 * وينسخها ويلصقها هنا. البيانات تأتي من الدرر مباشرة وبيد المستخدم، فتُعامل كمصدر حي.
 */
export class ManualDorarProvider implements HadithProvider {
  id = 'dorar-manual';
  live = true;
  private readonly records: SourceRecord[];
  private readonly query: string;

  constructor(records: SourceRecord[], query: string) {
    this.records = records;
    this.query = query;
  }

  async searchHadithSources(): Promise<ProviderSearchResult> {
    return { records: this.records, searchUrl: dorarSearchUrl(this.query) };
  }
}

/** رابط واجهة الدرر الذي يفتحه المستخدم في تبويب جديد */
export function dorarApiUrl(query: string): string {
  return `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(query.split(/\s+/).slice(0, 7).join(' '))}`;
}

/** يحلّل ما لصقه المستخدم من صفحة الدرر (JSON كما يظهر في المتصفح) */
export function parsePastedDorar(text: string, query: string): SourceRecord[] {
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i < 0 || j <= i) throw new Error('bad_paste');
  const json = JSON.parse(text.slice(i, j + 1));
  return parseDorarResponse(json, query, new Date().toISOString());
}

const KEY = 'bayyinah:dorar-collected:v1';

/** السجلات التي جُلبت يدويًا تُحفظ في المتصفح، فتُستخدم نسخةً مخزنة لاحقًا */
export function loadCollected(): SourceRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SourceRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveCollected(records: SourceRecord[]): void {
  try {
    const map = new Map(loadCollected().map((r) => [r.id, r]));
    for (const r of records) map.set(r.id, r);
    localStorage.setItem(KEY, JSON.stringify([...map.values()].slice(-3000)));
  } catch {
    /* التخزين غير متاح؛ لا مشكلة */
  }
}
