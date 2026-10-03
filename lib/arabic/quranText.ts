import { normalizeArabic } from './normalize.ts';

/** نص البحث من البطاقة: ما بين ﴿ ﴾ إن وُجد، بلا «قال تعالى» ولا الاستعاذة ولا «صدق الله العظيم» ولا أرقام الآيات */
export function quranQueryText(original: string): string {
  const inside = [...original.matchAll(/﴿([^﴾]*)﴾/g)].map((m) => m[1]);
  let t = inside.length ? inside.join(' ') : original;
  t = t.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ');
  let n = normalizeArabic(t).replace(/[0-9٠-٩۰-۹]+/g, ' ');
  const strip = [
    /^(و?قال|يقول) (الله )?(تعالي|سبحانه وتعالي|سبحانه|عز وجل|جل وعلا|جل جلاله)( في كتابه( الكريم)?)? /,
    /^اعوذ بالله من الشيطان الرجيم /,
    /^قال الله /,
  ];
  for (let pass = 0; pass < 2; pass++) for (const re of strip) n = n.replace(re, '');
  // البسملة في أول نص طويل ليست من الآيات المتتابعة (إلا في الفاتحة)
  if (/^بسم الله الرحمن الرحيم .{12,}/.test(n) && !/^بسم الله الرحمن الرحيم الحمد لله رب العالمين/.test(n)) {
    n = n.replace(/^بسم الله الرحمن الرحيم /, '');
  }
  n = n.replace(/ (صدق الله العظيم|صدق الله)$/, '');
  return n.replace(/\s+/g, ' ').trim();
}
