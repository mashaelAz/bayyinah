/**
 * تطبيع النص العربي لأغراض البحث والمطابقة فقط.
 * النص الأصلي لا يُعدّل في الواجهة أبدًا؛ هذه النسخة تُستخدم داخليًا.
 */

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
// كل ما ليس حرفًا عربيًا أو رقمًا أو مسافة
const NON_WORD = /[^ء-ي٠-٩۰-۹0-9\s]/g;

/** صيغ الصلاة على النبي ﷺ تُوحَّد حتى لا تؤثر على المطابقة */
const SALAWAT = [/ﷺ/g, /صلى الله عليه وسلم/g, /صلي الله عليه وسلم/g, /عليه الصلاة والسلام/g];

export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, '');
}

export function normalizeArabic(text: string): string {
  let t = text.normalize('NFC').replace(INVISIBLE, '');
  t = stripDiacritics(t).replace(TATWEEL, '');
  for (const s of SALAWAT) t = t.replace(s, ' ');
  t = t
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
  t = t.replace(NON_WORD, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/** تقسيم النص الأصلي إلى كلمات مع الحفاظ على حروفه كما هي (للعرض) */
export function displayTokens(text: string): string[] {
  return text
    .replace(INVISIBLE, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && normalizeArabic(w).length > 0);
}
