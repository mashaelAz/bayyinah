import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArabic, tokenize } from './arabic/normalize.ts';
import { quranQueryText } from './arabic/quranText.ts';
import { coverage, tokenSimilarity } from './matching/similarity.ts';
import type { QuranMatch } from './types.ts';

/**
 * التحقق من الآيات في نص المصحف الشريف.
 * - نص العرض: نص المصحف المضبوط بالتشكيل (Tanzil Simple)، المراجَع على مصحف المدينة النبوية برواية حفص.
 * - نص المطابقة: الرسم الإملائي بلا تشكيل، لأن البطاقات تُكتب عادةً بالإملاء المعتاد.
 * المصدر النصي: مشروع quran-api (ملكية عامة). يُبنى الملف بـ scripts/build-quran.mjs
 * لا يُعدَّل نص الآية أبدًا: يُعرض كما هو في المصحف.
 */

interface QuranData {
  names: string[];
  /** [السورة، الآية، نص العرض المشكول، النص الإملائي] */
  verses: [number, number, string, string][];
}

interface Index {
  data: QuranData;
  /** كلمات المصحف كلها متتابعة بعد التطبيع */
  words: string[];
  /** لكل كلمة: رقم الآية في المصفوفة */
  wordVerse: number[];
  /** موضع أول كلمة لكل آية */
  verseStart: number[];
  /** المصحف كله نصًا واحدًا لكشف العبارة المتصلة، مع موضع بداية كل كلمة */
  joined: string;
  charStart: number[];
  verseTokens: string[][];
  verseKeys: Set<string>[];
}

/** مفتاح تقريبي للكلمة للتصفية السريعة فقط */
function stem(w: string): string {
  return w.length > 3 ? w.replace(/^[وف]/, '') : w;
}

let INDEX: Index | null = null;

function load(): Index {
  if (INDEX) return INDEX;
  const data = JSON.parse(readFileSync(join(process.cwd(), 'data', 'quran.json'), 'utf8')) as QuranData;
  const words: string[] = [];
  const wordVerse: number[] = [];
  const verseStart: number[] = [];
  const verseTokens: string[][] = [];
  data.verses.forEach((v, i) => {
    const toks = tokenize(normalizeArabic(v[3]));
    verseStart.push(words.length);
    verseTokens.push(toks);
    for (const t of toks) {
      words.push(t);
      wordVerse.push(i);
    }
  });
  const charStart: number[] = [];
  let pos = 1;
  for (const w of words) {
    charStart.push(pos);
    pos += w.length + 1;
  }
  const verseKeys = verseTokens.map((t) => new Set(t.map(stem)));
  INDEX = { data, words, wordVerse, verseStart, joined: ` ${words.join(' ')} `, charStart, verseTokens, verseKeys };
  return INDEX;
}

function toMatch(ix: Index, fromVerse: number, toVerse: number, exact: boolean, similarity: number): QuranMatch {
  const vs = ix.data.verses.slice(fromVerse, toVerse + 1);
  const [surah, from] = vs[0];
  const to = vs[vs.length - 1][1];
  return {
    surah,
    surahName: ix.data.names[surah - 1],
    from,
    to,
    text: vs.map((v) => v[2]).join(' ۝ '),
    plain: vs.map((v) => v[3]).join(' '),
    exact,
    similarity,
    url: `https://quran.com/${surah}/${from}${to > from ? `-${to}` : ''}`,
  };
}

/**
 * يبحث عن النص في المصحف:
 * 1) عبارة متصلة مطابقة (ولو امتدت على أكثر من آية) → exact
 * 2) أقرب آية أو آيتين متتاليتين بالتشابه → قريب بلفظ مختلف (إن كفى التشابه)
 * يعيد null إذا لم يوجد ما يكفي.
 */
export function searchQuran(text: string): QuranMatch | null {
  const ix = load();
  const q = tokenize(quranQueryText(text));
  if (q.length < 2) return null;

  // 1) عبارة متصلة
  const at = ix.joined.indexOf(` ${q.join(' ')} `);
  if (at >= 0) {
    const firstWord = lowerBound(ix.charStart, at + 1);
    const lastWord = firstWord + q.length - 1;
    // العبارة القصيرة جدًا قد تتكرر في المصحف وفي غيره؛ نشترط 3 كلمات فأكثر أو آية كاملة
    const fv = ix.wordVerse[firstWord];
    const lv = ix.wordVerse[lastWord];
    const wholeVerse = ix.verseStart[fv] === firstWord && ix.verseTokens[lv].length + ix.verseStart[lv] - 1 === lastWord;
    if (q.length >= 3 || wholeVerse) return toMatch(ix, fv, lv, true, 1);
  }
  if (q.length < 4) return null;

  // 2) أقرب آية (أو آيتين متتاليتين) بالتشابه
  // تصفية سريعة: الآيات التي فيها أكثر كلمات النص (مع تجاوز واو العطف وفائه في أول الكلمة)
  const qk = new Set(q.map(stem));
  const need = Math.max(3, Math.ceil(q.length * 0.5));
  const candidates: { i: number; hits: number }[] = [];
  for (let i = 0; i < ix.verseKeys.length; i++) {
    let hits = 0;
    for (const k of qk) if (ix.verseKeys[i].has(k)) hits++;
    if (hits >= need) candidates.push({ i, hits });
  }
  candidates.sort((a, b) => b.hits - a.hits);
  let best: { from: number; to: number; score: number; start: number; len: number } | null = null;
  for (const { i } of candidates.slice(0, 50)) {
    const t = ix.verseTokens[i];
    for (const span of [0, 1]) {
      if (i + span >= ix.verseTokens.length) continue;
      if (span && ix.data.verses[i + span][0] !== ix.data.verses[i][0]) continue;
      const toks = span ? [...t, ...ix.verseTokens[i + 1]] : t;
      // تشابه الكلمات مع أقرب مقطع من الآية + نسبة ما ورد من النص المدخل في الآية بالترتيب
      const w = bestWindow(q, toks);
      const score = 0.5 * w.sim + 0.5 * coverage(q, toks);
      if (!best || score > best.score + 0.001) best = { from: i, to: i + span, score, start: w.start, len: w.len };
    }
  }
  if (!best || best.score < 0.6) return null;
  const m = toMatch(ix, best.from, best.to, false, Math.round(best.score * 1000) / 1000);
  // المقطع الأقرب من الآية بالرسم الإملائي، لبيان الفرق كلمةً بكلمة
  m.excerpt = m.plain.split(' ').slice(best.start, best.start + best.len).join(' ');
  return m;
}

/** أقرب مقطع متصل من الآية إلى النص المدخل، بطول قريب منه */
function bestWindow(q: string[], toks: string[]): { sim: number; start: number; len: number } {
  if (toks.length <= q.length + 2) return { sim: tokenSimilarity(q, toks), start: 0, len: toks.length };
  let best = { sim: 0, start: 0, len: toks.length };
  for (const len of [q.length - 1, q.length, q.length + 1]) {
    if (len < 2) continue;
    for (let i = 0; i + len <= toks.length; i++) {
      const sim = tokenSimilarity(q, toks.slice(i, i + len));
      if (sim > best.sim) best = { sim, start: i, len };
    }
  }
  return best;
}

function lowerBound(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
