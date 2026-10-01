import { normalizeArabic, tokenize } from '../arabic/normalize.ts';
import { charSimilarity, coverage, tokenSimilarity } from './similarity.ts';
import type { SourceRecord, TextMatch } from '../types.ts';

/**
 * محرك المطابقة متعدد المستويات:
 *   1) Exact            تطابق حرفي
 *   2) Normalized exact تطابق بعد التطبيع
 *   3) Phrase           النص المدخل جزء من نص المصدر أو العكس
 *   4) Fuzzy            تشابه تقريبي على مستوى الكلمات والحروف
 *
 * similarity = درجة تشابه النصوص فقط.
 * لا تعني بأي حال درجة صحة الحديث، ولا تُستخدم لاستنتاج حكم.
 */

/** بعض سجلات المصدر تأتي بصيغة: «لفظ مختصر [يعني حديث: النص الكامل]» */
function matchableTexts(record: SourceRecord): string[] {
  const texts = new Set<string>();
  const inner = record.text.match(/\[\s*يعني\s+حديث\s*[:：]\s*([^\]]+)\]/);
  if (inner) texts.add(inner[1]);
  const outer = record.text.replace(/\[[^\]]*\]/g, ' ').replace(/(\.\s*){2,}/g, ' ');
  texts.add(outer);
  return [...texts].map((t) => t.trim()).filter(Boolean);
}

function scoreAgainst(queryOriginal: string, q: string[], text: string): Omit<TextMatch, 'record'> {
  const nText = normalizeArabic(text);
  const t = tokenize(nText);
  const nQuery = q.join(' ');

  if (queryOriginal.trim() === text.trim()) {
    return { level: 'exact', similarity: 1, isPartOfSource: false };
  }
  if (nQuery === nText) {
    return { level: 'normalized_exact', similarity: 1, isPartOfSource: false };
  }
  const cov = coverage(q, t);
  if (q.length >= 3 && cov >= 0.98 && t.length > q.length) {
    // كل كلمات النص المدخل موجودة بالترتيب داخل نص المصدر
    return { level: 'phrase', similarity: 1, isPartOfSource: true };
  }
  const tokenSim = tokenSimilarity(q, t);
  const charSim = charSimilarity(nQuery, nText);
  const revCov = coverage(t, q);
  if (t.length >= 3 && revCov >= 0.98) {
    // نص المصدر كاملًا داخل النص المتداول، مع إضافات عليه
    return { level: 'phrase', similarity: round(0.5 * tokenSim + 0.3 + 0.2 * charSim), isPartOfSource: false };
  }
  // مزيج من: تشابه الكلمات، ونسبة ما ورد من نص المصدر داخل النص المتداول، والتشابه الحرفي
  return {
    level: 'fuzzy',
    similarity: round(0.5 * tokenSim + 0.3 * revCov + 0.2 * charSim),
    isPartOfSource: false,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function matchHadithText(
  queryOriginal: string,
  normalizedQuery: string,
  records: SourceRecord[],
): TextMatch[] {
  const q = tokenize(normalizedQuery);
  if (!q.length) return [];

  const matches = records.map((record) => {
    let best: Omit<TextMatch, 'record'> = { level: 'none', similarity: 0, isPartOfSource: false };
    for (const text of matchableTexts(record)) {
      const s = scoreAgainst(queryOriginal, q, text);
      if (s.similarity > best.similarity) best = s;
    }
    return { record, ...best };
  });

  const levelRank: Record<string, number> = {
    exact: 4,
    normalized_exact: 3,
    phrase: 2,
    fuzzy: 1,
    none: 0,
  };

  return matches
    .filter((m) => m.similarity > 0)
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      if (levelRank[b.level] !== levelRank[a.level]) return levelRank[b.level] - levelRank[a.level];
      // عند التساوي: نفضّل السجل الأقرب طولًا للنص المدخل، ثم ما فيه حكم صريح
      const la = Math.abs(tokenize(a.record.normalized_text).length - q.length);
      const lb = Math.abs(tokenize(b.record.normalized_text).length - q.length);
      if (la !== lb) return la - lb;
      return Number(Boolean(b.record.grade)) - Number(Boolean(a.record.grade));
    });
}
