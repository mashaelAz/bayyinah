/**
 * أدوات تشابه النصوص.
 *
 * تنبيه صريح: جميع الدرجات هنا تقيس تشابه الألفاظ فقط،
 * ولا تمثل درجة صحة الحديث ولا احتمال ثبوته.
 */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** تشابه حرفي بين 0 و1 */
export function charSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * تساوي كلمتين مع تسامح بسيط في الصيغة (مثل: النية / النيات، الأعمال / والأعمال).
 * يُستخدم في المحاذاة فقط.
 */
export function tokensEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const strip = (w: string) =>
    w
      .replace(/^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل)(?=...)/, '')
      .replace(/(ات|ها|هم|ين|ون|ان|ه)$/, (m, _g, off: number) => (off >= 2 ? '' : m));
  const sa = strip(a);
  const sb = strip(b);
  if (sa === sb) return true;
  if (Math.min(sa.length, sb.length) < 3) return false;
  return charSimilarity(sa, sb) >= 0.75;
}

/** طول أطول تتابع مشترك بين قائمتي كلمات، مع جدول المحاذاة */
export function lcsTable(a: string[], b: string[]): number[][] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = tokensEquivalent(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/** تشابه على مستوى الكلمات (Dice عبر LCS) بين 0 و1 */
export function tokenSimilarity(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const lcs = lcsTable(a, b)[0][0];
  return (2 * lcs) / (a.length + b.length);
}

/** نسبة كلمات النص المدخل الموجودة في نص المصدر بالترتيب */
export function coverage(query: string[], source: string[]): number {
  if (!query.length) return 0;
  return lcsTable(query, source)[0][0] / query.length;
}
