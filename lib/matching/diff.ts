import { displayTokens, normalizeArabic } from '../arabic/normalize.ts';
import { lcsTable, tokensEquivalent } from './similarity.ts';
import type { DiffToken, TextDiff } from '../types.ts';

/**
 * «بصمة النص»: محاذاة كلمة بكلمة بين النص المتداول والنص الموثق،
 * مع إبراز ما أُضيف إلى النص المتداول وما سقط منه.
 * النسبة الناتجة فرق نصي فقط، ولا علاقة لها بالحكم على الحديث.
 */
export function diffTexts(circulatingText: string, sourceText: string): TextDiff {
  const cDisp = displayTokens(circulatingText);
  const sDisp = displayTokens(sourceText);
  const c = cDisp.map(normalizeArabic);
  const s = sDisp.map(normalizeArabic);
  const dp = lcsTable(c, s);

  const circulating: DiffToken[] = [];
  const source: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < c.length && j < s.length) {
    if (tokensEquivalent(c[i], s[j])) {
      // كلمة متقاربة الصيغة وليست متطابقة تُعامل كتغيير لإبرازها
      if (c[i] === s[j]) {
        circulating.push({ op: 'equal', text: cDisp[i] });
        source.push({ op: 'equal', text: sDisp[j] });
      } else {
        circulating.push({ op: 'added', text: cDisp[i] });
        source.push({ op: 'removed', text: sDisp[j] });
      }
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      circulating.push({ op: 'added', text: cDisp[i] });
      i++;
    } else {
      source.push({ op: 'removed', text: sDisp[j] });
      j++;
    }
  }
  while (i < c.length) circulating.push({ op: 'added', text: cDisp[i++] });
  while (j < s.length) source.push({ op: 'removed', text: sDisp[j++] });

  const addedCount = circulating.filter((t) => t.op === 'added').length;
  const removedCount = source.filter((t) => t.op === 'removed').length;
  const differencePercent = cDisp.length
    ? Math.round((addedCount / cDisp.length) * 100)
    : 0;

  return { circulating, source, addedCount, removedCount, differencePercent };
}
