import { DemoProvider } from './demo.ts';
import { dorarSearchUrl, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * المصادر المحلية حين يتعذر الاتصال المباشر بالدرر:
 * نصوص الصحيحين على خادم بيّنة + السجلات المنسوخة من الدرر (المرفقة والمجلوبة بجسر الدرر).
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
    let fromSahihayn: SourceRecord[] = [];
    try {
      const res = await fetch(`/api/local?q=${encodeURIComponent(query)}`);
      if (res.ok) fromSahihayn = ((await res.json())?.records ?? []) as SourceRecord[];
    } catch {
      /* نكمل بالسجلات المخزنة */
    }
    return { records: [...fromDorarCopy, ...fromSahihayn], searchUrl: dorarSearchUrl(query.split(/\s+/).slice(0, 7).join(' ')) };
  }
}
