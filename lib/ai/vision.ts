/**
 * قراءة الصورة بنموذج رؤية (اختياري، بطلب صريح من المستخدم).
 *
 * حدود صارمة:
 * - ينسخ النص المكتوب في الصورة فقط، ولا يكمل ولا يصحّح ولا يحكم.
 * - النص الناتج يُعرض للمستخدم للمراجعة قبل البحث، ثم يُطابق مع المصدر؛
 *   فلو أخطأ النموذج لن يظهر حكم إلا لنص موجود فعلًا في المصدر.
 * - الصورة لا تُحفظ في خادم بيّنة.
 */

const PROMPT = `انسخ كل النص العربي المكتوب في هذه الصورة كما هو حرفيًا، سطرًا سطرًا.
القواعد:
- لا تضف أي كلمة غير مكتوبة في الصورة، ولا تكمل حديثًا ناقصًا من حفظك، ولا تصحح الأخطاء.
- يمكنك حذف التشكيل.
- لا تكتب أي شرح أو حكم أو تعليق. أعد النص المنسوخ فقط.
- إذا لم يكن في الصورة نص عربي أعد سطرًا فارغًا.`;

export function isAiOcrEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function aiReadImage(base64: string, mediaType: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const text: string = body?.content?.[0]?.text ?? '';
    return text.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
