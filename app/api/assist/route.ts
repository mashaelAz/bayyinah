import { NextResponse } from 'next/server';
import { extractSearchText } from '../../../lib/arabic/extract.ts';
import { aiAssistExtraction, isAiAssistEnabled } from '../../../lib/ai/assist.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * المساعد اللغوي الاختياري: يفصل المتن عن الإضافات فقط، ولا يُصدر أي حكم.
 * إذا لم يُضبط ANTHROPIC_API_KEY يرد 204 ويكمل المتصفح بالقواعد اللغوية.
 */
export async function POST(req: Request) {
  if (!isAiAssistEnabled()) return new NextResponse(null, { status: 204 });
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 2000) : '';
  if (!text) return NextResponse.json({ reason: 'empty' }, { status: 400 });
  const extraction = await aiAssistExtraction(extractSearchText(text, body?.extractedText ?? ''));
  return NextResponse.json({ extraction });
}
