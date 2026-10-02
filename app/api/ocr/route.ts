import { NextResponse } from 'next/server';
import { aiReadImage, isAiOcrEnabled } from '../../../lib/ai/vision.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX = 4_000_000; // حجم base64 الأقصى

/** هل القراءة بالذكاء الاصطناعي متاحة؟ (تظهر في الواجهة فقط إذا ضُبط المفتاح) */
export async function GET() {
  return NextResponse.json({ enabled: isAiOcrEnabled() });
}

/** قراءة صورة بطلب صريح من المستخدم. لا تُحفظ الصورة. */
export async function POST(req: Request) {
  if (!isAiOcrEnabled()) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const data = typeof body?.data === 'string' ? body.data : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!data || data.length > MAX || !TYPES.includes(type)) {
    return NextResponse.json({ reason: 'bad_image' }, { status: 400 });
  }
  const text = await aiReadImage(data, type);
  if (text === null) return NextResponse.json({ reason: 'unavailable' }, { status: 502 });
  return NextResponse.json({ text });
}
