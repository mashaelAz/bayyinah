import { NextResponse } from 'next/server';
import { verifyText } from '../../../lib/verify.ts';
import { getProviders } from '../../../lib/providers/index.ts';
import { demoRecords } from '../../../lib/providers/demoData.ts';
import { aiAssistExtraction, isAiAssistEnabled } from '../../../lib/ai/assist.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LEN = 2000;

export async function POST(req: Request) {
  let body: { text?: unknown; extractedText?: unknown; fromImage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صحيحة.' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'أدخل نصًا للتحقق منه.' }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json({ error: `النص أطول من ${MAX_LEN} حرف. اختصره إلى العبارة المراد التحقق منها.` }, { status: 400 });
  }

  try {
    const result = await verifyText(
      {
        text,
        extractedText: typeof body.extractedText === 'string' ? body.extractedText : '',
        fromImage: body.fromImage === true,
      },
      {
        providers: getProviders(demoRecords),
        assist: isAiAssistEnabled() ? aiAssistExtraction : undefined,
      },
    );
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('verify failed', err);
    return NextResponse.json(
      { error: 'تعذر الوصول إلى مصدر التحقق حاليًا. لم نصدر نتيجة غير موثقة.' },
      { status: 502 },
    );
  }
}
