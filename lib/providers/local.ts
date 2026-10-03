import { DemoProvider } from './demo.ts';
import { dorarSearchUrl, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * المصادر المحلية حين يتعذر الاتصال المباشر بالدرر:
 * متون الكتب الستة على خادم بيّنة + السجلات المنسوخة من الدرر (المرفقة والمجلوبة بجسر الدرر).
 */
export class LocalProvider implements HadithProvider {
  id = 'local';
  live = false;
  private readonly demo: DemoProvider;

  constructor(records: SourceRecord[]) {
    this.demo = new DemoProvider(records);
  }

  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    const fromDorarCopy = (await this.demo.searchHadithSources(query)).records;
    let fromBooks: SourceRecord[] = [];
    let coverage: 'six_books' | undefined;
    try {
      const res = await fetch(`/api/local?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const body = await res.json();
        fromBooks = (body?.records ?? []) as SourceRecord[];
        if (body?.coverage === 'six_books') coverage = 'six_books';
      }
    } catch {
      /* نكمل بالسجلات المخزنة */
    }
    return {
      records: [...fromDorarCopy, ...fromBooks],
      searchUrl: dorarSearchUrl(query.split(/\s+/).slice(0, 7).join(' ')),
      coverage,
    };
  }
}
