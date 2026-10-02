import { NextResponse } from 'next/server';
import { askAssistant, isAskEnabled } from '../../../lib/ai/ask.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ enabled: isAskEnabled() });
}

/** سؤال عن نتيجة التحقق. السياق هو نتيجة التحقق نفسها فقط */
export async function POST(req: Request) {
  if (!isAskEnabled()) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 500) : '';
  const context = typeof body?.context === 'string' ? body.context.slice(0, 6000) : '';
  const lang = typeof body?.lang === 'string' ? body.lang : 'ar';
  const history = Array.isArray(body?.history)
    ? body.history
        .filter((h: unknown) => h && typeof (h as { q?: unknown }).q === 'string' && typeof (h as { a?: unknown }).a === 'string')
        .slice(-4)
    : [];
  if (!question || !context) return NextResponse.json({ reason: 'empty' }, { status: 400 });
  const answer = await askAssistant(context, history, question, lang);
  if (!answer) return NextResponse.json({ reason: 'unavailable' }, { status: 502 });
  return NextResponse.json({ answer });
}
