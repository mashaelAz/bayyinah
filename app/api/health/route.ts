import { NextResponse } from 'next/server';
import { isAiAssistEnabled } from '../../../lib/ai/assist.ts';
import { DorarProvider } from '../../../lib/providers/dorar.ts';

export const dynamic = 'force-dynamic';

/**
 * فحص حالة التشغيل.
 * /api/health          حالة عامة
 * /api/health?dorar=1  يختبر الاتصال بالدرر السنية فعليًا ويعرض السبب عند الفشل
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = {
    ok: true,
    provider: process.env.HADITH_PROVIDER || 'auto',
    aiAssist: isAiAssistEnabled(),
    time: new Date().toISOString(),
  };
  if (!url.searchParams.has('dorar')) return NextResponse.json(base);

  const started = Date.now();
  try {
    const res = await new DorarProvider().searchHadithSources('إنما الأعمال بالنيات');
    return NextResponse.json({ ...base, dorar: { reachable: true, results: res.records.length, ms: Date.now() - started } });
  } catch (err) {
    return NextResponse.json({ ...base, dorar: { reachable: false, reason: (err as Error).message, ms: Date.now() - started } });
  }
}
