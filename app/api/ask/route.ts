import { NextResponse } from 'next/server';
import { askAssistant, isAskEnabled } from '../../../lib/ai/ask.ts';
import { checkGrounding } from '../../../lib/ai/groundCheck.ts';

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
  // التوليد ثم فحص الإسناد: أي رقم أو كتاب أو محدّث أو سورة أو حكم ليس في بيانات النتيجة يحجب الإجابة
  let answer = await askAssistant(context, history, question, lang);
  if (!answer) return NextResponse.json({ reason: 'unavailable' }, { status: 502 });
  let check = checkGrounding(answer, context, question);
  if (!check.ok) {
    // محاولة ثانية واحدة مع تنبيه صريح بما لا يجوز ذكره
    const retry = await askAssistant(
      context,
      history,
      question,
      lang,
      `ذكرتَ في محاولة سابقة ما ليس في البيانات (${check.issues.join('، ')}). لا تذكره، والتزم بالبيانات حرفيًا.`,
    );
    if (retry) {
      const second = checkGrounding(retry, context, question);
      if (second.ok) {
        answer = retry;
        check = second;
      }
    }
  }
  if (!check.ok) return NextResponse.json({ blocked: true, issues: check.issues });
  return NextResponse.json({ answer, verified: true });
}
