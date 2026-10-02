import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArabic, tokenize } from './arabic/normalize.ts';
import { dorarSearchUrl } from './providers/types.ts';
import type { SourceRecord } from './types.ts';

/**
 * نصوص الصحيحين (البخاري ومسلم) نسخةً نصية مفتوحة على الخادم.
 * الحزمة العلمية تعتمد «الأحاديث الصحيحة من الصحيحين»، فإذا وُجد النص فيهما فهو من الصحيح المعتمد.
 * المصدر النصي: مشروع hadith-json (ترخيص ISC) المأخوذ من Sunnah.com. انظر docs/TOOLS_AND_LICENSES.md
 */

type Row = [string, number, string];
interface Indexed {
  row: Row;
  tokens: Set<string>;
}

let INDEX: Indexed[] | null = null;
let DF: Map<string, number> | null = null;

function load(): Indexed[] {
  if (INDEX) return INDEX;
  const rows = JSON.parse(readFileSync(join(process.cwd(), 'data', 'sahihayn.json'), 'utf8')) as Row[];
  DF = new Map();
  INDEX = rows.map((row) => {
    const tokens = new Set(tokenize(normalizeArabic(row[2])));
    for (const t of tokens) DF!.set(t, (DF!.get(t) ?? 0) + 1);
    return { row, tokens };
  });
  return INDEX;
}

const BOOK: Record<string, { scholar: string; source: string }> = {
  b: { scholar: 'البخاري', source: 'صحيح البخاري' },
  m: { scholar: 'مسلم', source: 'صحيح مسلم' },
};

/** بحث بالكلمات مع ترجيح الكلمات النادرة (TF-IDF مبسّط) */
export function searchSahihayn(query: string, limit = 12): SourceRecord[] {
  const index = load();
  const q = [...new Set(tokenize(normalizeArabic(query)))];
  if (!q.length) return [];
  const n = index.length;
  const weight = (t: string) => Math.log(1 + n / (1 + (DF!.get(t) ?? 0)));
  const total = q.reduce((s, t) => s + weight(t), 0);
  const scored: { item: Indexed; score: number }[] = [];
  for (const item of index) {
    let hit = 0;
    for (const t of q) if (item.tokens.has(t)) hit += weight(t);
    const score = hit / total;
    if (score >= 0.55) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const now = new Date().toISOString();
  return scored.slice(0, limit).map(({ item }) => {
    const [code, num, text] = item.row;
    const book = BOOK[code];
    return {
      id: `sahihayn-${code}-${num}`,
      text,
      normalized_text: normalizeArabic(text),
      narrator: '',
      scholar: book.scholar,
      source: book.source,
      reference: '',
      grade: 'صحيح',
      takhrij: `أخرجه ${book.scholar} في صحيحه`,
      source_url: dorarSearchUrl(text.split(/\s+/).slice(0, 7).join(' ')),
      verified_at: now,
      provider: 'demo-dorar',
    } satisfies SourceRecord;
  });
}
