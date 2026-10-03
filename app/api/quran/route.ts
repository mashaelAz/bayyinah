import { NextResponse } from 'next/server';
import { searchQuran } from '../../../lib/quran.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** البحث عن النص في المصحف الشريف (مصحف المدينة، رواية حفص) */
export async function POST(req: Request) {
  let text = '';
  try {
    text = String((await req.json())?.text ?? '').slice(0, 2000);
  } catch {
    return NextResponse.json({ match: null, reason: 'bad_request' }, { status: 400 });
  }
  if (!text.trim()) return NextResponse.json({ match: null });
  try {
    return NextResponse.json({ match: searchQuran(text) });
  } catch {
    return NextResponse.json({ match: null, reason: 'quran_unavailable' }, { status: 500 });
  }
}
