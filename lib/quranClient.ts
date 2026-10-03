import type { QuranMatch } from './types.ts';

/** يسأل خادم بيّنة عن النص في المصحف. يرمي خطأ إذا تعذّر الخادم (فلا نقول «لم نجده» بلا بحث) */
export async function checkQuran(text: string): Promise<QuranMatch | null> {
  const res = await fetch('/api/quran', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 2000) }),
  });
  if (!res.ok) throw new Error('quran_unavailable');
  const body = await res.json();
  return (body?.match ?? null) as QuranMatch | null;
}
