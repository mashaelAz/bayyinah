import { normalizeArabic, tokenize } from '../arabic/normalize.ts';
import { coverage } from '../matching/similarity.ts';
import { dorarSearchUrl, type HadithProvider, type ProviderSearchResult } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * مزوّد تجريبي يعمل على نسخة مخزنة من سجلات حقيقية منسوخة من الدرر السنية
 * (data/hadiths.json). وظيفته: عرض الهاكثون + ذاكرة مؤقتة + بديل عند تعذر الاتصال.
 * لا يحتوي أي سجل مختلق، وكل سجل معه رابط مصدره.
 */
export class DemoProvider implements HadithProvider {
  id = 'demo';
  live = false;

  private readonly dataset: SourceRecord[];

  constructor(dataset: SourceRecord[]) {
    this.dataset = dataset;
  }

  async searchHadithSources(query: string): Promise<ProviderSearchResult> {
    const q = tokenize(normalizeArabic(query));
    const records = this.dataset.filter((r) => {
      const t = tokenize(r.normalized_text || normalizeArabic(r.text));
      // يكفي اشتراك جزء معتبر من الكلمات لترشيح السجل؛ المطابقة الفعلية في المحرك
      return coverage(t, q) >= 0.5 || coverage(q, t) >= 0.5;
    });
    return { records, searchUrl: dorarSearchUrl(q.slice(0, 7).join(' ')) };
  }
}
