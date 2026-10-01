import { NextResponse } from 'next/server';
import { isAiAssistEnabled } from '../../../lib/ai/assist.ts';

export const dynamic = 'force-dynamic';

/** فحص سريع لحالة التشغيل أثناء التحكيم */
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: process.env.HADITH_PROVIDER || 'auto',
    aiAssist: isAiAssistEnabled(),
    time: new Date().toISOString(),
  });
}
