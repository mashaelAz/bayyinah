import { NextResponse } from 'next/server';
import { DorarProvider } from '../../../lib/providers/dorar.ts';
import { ProviderUnavailableError } from '../../../lib/providers/types.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** وسيط احتياطي للدرر السنية: يُستخدم فقط إذا تعذّر الاتصال من المتصفح مباشرة */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 300) ?? '';
  if (!q) return NextResponse.json({ reason: 'empty_query' }, { status: 400 });
  try {
    const res = await new DorarProvider().searchHadithSources(q);
    return NextResponse.json(res, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const reason = err instanceof ProviderUnavailableError ? err.message : 'error';
    return NextResponse.json({ reason }, { status: 502 });
  }
}
