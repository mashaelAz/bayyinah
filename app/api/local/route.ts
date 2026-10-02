import { NextResponse } from 'next/server';
import { searchSahihayn } from '../../../lib/sahihayn.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** البحث في نصوص الصحيحين على الخادم */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 400);
  if (!q.trim()) return NextResponse.json({ records: [] });
  try {
    return NextResponse.json({ records: searchSahihayn(q) });
  } catch {
    return NextResponse.json({ records: [], reason: 'local_unavailable' }, { status: 500 });
  }
}
