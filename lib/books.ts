import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArabic, tokenize } from './arabic/normalize.ts';
import { dorarSearchUrl } from './providers/types.ts';
import type { SourceRecord } from './types.ts';

/**
 * متون الكتب الستة على خادم بيّنة: صحيح البخاري، صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن النسائي، سنن ابن ماجه.
 * - الصحيحان: الحكم «صحيح» لأنهما من الصحيح المعتمد.
 * - السنن: حكم الألباني كما ورد في المصدر (وإن غاب فحكم محقق آخر من المصدر نفسه).
 * المصدر النصي: مشروع hadith-api (ملكية عامة) المأخوذ من Sunnah.com، والأرقام بالترقيم المعتمد لكل كتاب.
 * يُبنى الملف بـ scripts/build-books.mjs. انظر docs/SOURCES.md
 */

type Row = [string, string, string, string, string];
interface Indexed {
  row: Row;
  tokens: Set<string>;
  /** الكلمات بعد التطبيع، مفصولة بمسافة ومحاطة بمسافتين، لكشف العبارة المتصلة */
  joined: string;
  len: number;
}

let INDEX: Indexed[] | null = null;
let DF: Map<string, number> | null = null;

function load(): Indexed[] {
  if (INDEX) return INDEX;
  const rows = JSON.parse(readFileSync(join(process.cwd(), 'data', 'books.json'), 'utf8')) as Row[];
  DF = new Map();
  INDEX = rows.map((row) => {
    const words = tokenize(normalizeArabic(row[2]));
    const tokens = new Set(words);
    for (const t of tokens) DF!.set(t, (DF!.get(t) ?? 0) + 1);
    return { row, tokens, joined: ` ${words.join(' ')} `, len: words.length };
  });
  return INDEX;
}

export const BOOKS: Record<string, { author: string; source: string }> = {
  b: { author: 'البخاري', source: 'صحيح البخاري' },
  m: { author: 'مسلم', source: 'صحيح مسلم' },
  d: { author: 'أبو داود', source: 'سنن أبي داود' },
  t: { author: 'الترمذي', source: 'جامع الترمذي' },
  n: { author: 'النسائي', source: 'سنن النسائي' },
  i: { author: 'ابن ماجه', source: 'سنن ابن ماجه' },
};

/** أسماء الكتب التي يشملها البحث، للعرض */
export const BOOK_NAMES = Object.values(BOOKS).map((b) => b.source);

/**
 * بحث بالكلمات مع ترجيح الكلمات النادرة (TF-IDF مبسّط).
 * إذا قلّت النتائج والنص طويل، نبحث أيضًا بأول سبع كلمات: النص المتداول كثيرًا ما يُزاد في آخره.
 */
export function searchBooks(query: string, limit = 12): SourceRecord[] {
  const words = tokenize(normalizeArabic(query));
  const first = rank(words);
  if (first.length >= 3 || words.length <= 7) return toRecords(first.slice(0, limit));
  const seen = new Set(first.map((x) => x.item));
  const more = rank(words.slice(0, 7)).filter((x) => !seen.has(x.item));
  return toRecords([...first, ...more].slice(0, limit));
}

interface Scored {
  item: Indexed;
  score: number;
  len: number;
}

function rank(words: string[]): Scored[] {
  const index = load();
  const q = [...new Set(words)];
  if (!q.length) return [];
  const n = index.length;
  const weight = (t: string) => Math.log(1 + n / (1 + (DF!.get(t) ?? 0)));
  const total = q.reduce((s, t) => s + weight(t), 0);
  const phrase = words.join(' ');
  const scored: Scored[] = [];
  for (const item of index) {
    let hit = 0;
    for (const t of q) if (item.tokens.has(t)) hit += weight(t);
    let score = hit / total;
    if (score < 0.55) continue;
    // ترجيح ما ورد فيه النص عبارةً متصلة، لا كلمات متفرقة
    if (score > 0.99 && item.joined.includes(` ${phrase} `)) score += 1;
    scored.push({ item, score, len: item.len });
  }
  // عند التساوي: الأقصر (الأقرب للنص) ثم الصحيحان ثم بقية الكتب بترتيبها
  const order = 'bmdtni';
  scored.sort(
    (a, b) =>
      b.score - a.score || a.len - b.len || order.indexOf(a.item.row[0]) - order.indexOf(b.item.row[0]),
  );
  return scored.slice(0, 40);
}

function toRecords(list: Scored[]): SourceRecord[] {
  const now = new Date().toISOString();
  return list.map(({ item }) => {
    const [code, ref, text, grade, grader] = item.row;
    const book = BOOKS[code];
    const sahih = code === 'b' || code === 'm';
    return {
      id: `book-${code}-${ref}`,
      text,
      normalized_text: normalizeArabic(text),
      narrator: '',
      scholar: sahih ? book.author : grader,
      source: book.source,
      reference: ref,
      grade,
      takhrij: sahih ? `أخرجه ${book.author} في صحيحه (${ref})` : `أخرجه ${book.author} (${ref})${grade ? `، وحكم ${grader}: ${grade}` : ''}`,
      source_url: dorarSearchUrl(text.split(/\s+/).slice(0, 7).join(' ')),
      verified_at: now,
      provider: 'demo-dorar',
    } satisfies SourceRecord;
  });
}
