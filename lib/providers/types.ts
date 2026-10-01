import type { SourceRecord } from '../types.ts';

export interface ProviderSearchResult {
  records: SourceRecord[];
  /** رابط صفحة البحث في المصدر نفسه، ليراجع المستخدم بنفسه */
  searchUrl: string;
}

/**
 * واجهة موحّدة لأي مصدر حديثي.
 * الواجهة الأمامية لا تعرف أي مزوّد يعمل، فاستبدال المزوّد لا يغيّر التصميم.
 */
export interface HadithProvider {
  id: string;
  name: string;
  live: boolean;
  searchHadithSources(query: string): Promise<ProviderSearchResult>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

export function dorarSearchUrl(query: string): string {
  return `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}`;
}
