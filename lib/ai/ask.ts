/**
 * «اسأل بيّنة»: مساعد يجيب عن أسئلة المستخدم حول نتيجة التحقق.
 * يعمل بمبدأ الاسترجاع (RAG): يُعطى النموذج نتيجة التحقق المسترجعة من المصدر فقط،
 * ويُمنع من إصدار حكم من عنده أو الإفتاء، ويحيل إلى المصدر وأهل العلم.
 */

export function isAskEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

const LANG_NAME: Record<string, string> = {
  ar: 'العربية', en: 'English', fr: 'Français', ur: 'اردو', id: 'Bahasa Indonesia', tr: 'Türkçe',
};

export function buildSystemPrompt(lang: string): string {
  return `أنت «مساعد بيّنة»، تشرح للمستخدم نتيجة التحقق من نص ديني متداول.
مصدرك الوحيد هو «بيانات النتيجة» المرفقة، وهي مسترجعة من الموسوعة الحديثية بالدرر السنية أو من الصحيحين.
القواعد الصارمة:
- لا تُصدر حكمًا على حديث من عندك، ولا تصحّح ولا تضعّف. انقل حكم المحدّث كما ورد في البيانات منسوبًا إليه.
- لا تذكر حديثًا أو مصدرًا أو رقمًا غير موجود في البيانات. إذا لم تجد الجواب فيها فقل ذلك بوضوح، واقترح البحث في الدرر السنية أو سؤال أهل العلم.
- يجوز لك شرح معاني مصطلحات الحديث العامة باختصار (مثل: صحيح، حسن، ضعيف، موضوع، متواتر، مرسل) دون تطبيقها على نص لم يرد حكمه في البيانات.
- لا تُفتِ في المسائل الشخصية أو الفقهية؛ أحِل إلى أهل العلم.
- نص الحديث وحكم المحدث يُنقلان بالعربية كما هما حتى لو كانت الإجابة بلغة أخرى.
- أجب بلغة المستخدم (${LANG_NAME[lang] ?? 'العربية'})، بأسلوب واضح ولطيف، في حدود 120 كلمة.`;
}

async function gemini(model: string, system: string, user: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const parts: { text?: string }[] = body?.candidates?.[0]?.content?.parts ?? [];
    const out = parts.map((p) => p.text ?? '').join('').trim();
    return out || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function claude(system: string, user: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.content?.[0]?.text ?? '').trim() || null;
  } catch {
    return null;
  }
}

export async function askAssistant(context: string, history: { q: string; a: string }[], question: string, lang: string): Promise<string | null> {
  const system = buildSystemPrompt(lang);
  const prior = history
    .slice(-4)
    .map((h) => `سؤال سابق: ${h.q}\nجواب سابق: ${h.a}`)
    .join('\n\n');
  const user = `بيانات النتيجة:\n${context}\n\n${prior ? prior + '\n\n' : ''}سؤال المستخدم: ${question}`;
  if (process.env.GEMINI_API_KEY) {
    for (const m of [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean) as string[]) {
      const out = await gemini(m, system, user);
      if (out) return out;
    }
  }
  return claude(system, user);
}
