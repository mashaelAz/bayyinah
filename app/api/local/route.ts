import { NextResponse } from 'next/server';
import { searchBooks } from '../../../lib/books.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** البحث في متون الكتب الستة على الخادم */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 400);
  if (!q.trim()) return NextResponse.json({ records: [], coverage: 'six_books' });
  try {
    return NextResponse.json({ records: searchBooks(q), coverage: 'six_books' });
  } catch {
    return NextResponse.json({ records: [], reason: 'local_unavailable' }, { status: 500 });
  }
}
