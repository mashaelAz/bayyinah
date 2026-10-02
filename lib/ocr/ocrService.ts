/**
 * طبقة التعرف الضوئي على الحروف (OCR).
 * التنفيذ: Tesseract.js بنموذج العربية داخل متصفح المستخدم، فلا تُرفع الصورة إلى أي خادم.
 * قبل القراءة نحسّن الصورة: تكبير، وتحويل للرمادي، وفصل النص عن الخلفية،
 * لأن البطاقات الدعوية غالبًا بخطوط ملوّنة على خلفيات مزخرفة.
 */

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  text: string;
  /** جودة القراءة التقديرية بين 0 و1 — لتنبيه المستخدم فقط */
  quality: number;
}

export interface OcrService {
  recognize(image: File | Blob, onProgress?: (p: OcrProgress) => void): Promise<OcrResult>;
}

type Variant = { size: number; binarize: boolean };

/**
 * نسخ الصورة التي نجرّبها بالترتيب. Tesseract يقرأ أفضل حين يكون ارتفاع الحرف متوسطًا،
 * والبطاقات الدعوية فيها خط ضخم مزخرف، فنجرّب أحجامًا مختلفة مع وبدون فصل الخلفية.
 */
const VARIANTS: Variant[] = [
  { size: 1600, binarize: true },
  { size: 900, binarize: true },
  { size: 1200, binarize: false },
  { size: 600, binarize: true },
];

/** تحسين الصورة قبل القراءة: تغيير الحجم، وتدرّج رمادي، واختياريًا فصل النص عن الخلفية */
async function preprocess(image: File | Blob, v: Variant): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(image);
    const scale = Math.min(3, v.size / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    // هامش أبيض حول النص يحسّن القراءة
    const pad = Math.round(Math.max(w, h) * 0.04);
    canvas.width = w + pad * 2;
    canvas.height = h + pad * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return image;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, pad, pad, w, h);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const n = canvas.width * canvas.height;

    // تدرّج رمادي يعتمد على أغمق قناة لونية، فالنص الأحمر والأخضر يصير غامقًا مثل الأسود
    const gray = new Uint8ClampedArray(n);
    const hist = new Array(256).fill(0);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = Math.min(d[i], d[i + 1], d[i + 2]) * 0.6 + (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * 0.4;
      gray[p] = g;
      hist[Math.round(g)]++;
    }
    // عتبة Otsu لفصل النص عن الخلفية
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = n - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) ** 2;
      if (between > best) {
        best = between;
        threshold = t;
      }
    }
    // إذا كانت الخلفية غامقة والنص فاتح نعكس الألوان
    let dark = 0;
    for (let p = 0; p < n; p++) if (gray[p] < threshold) dark++;
    const invert = dark > n / 2;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let val = v.binarize ? (gray[p] < threshold ? 0 : 255) : gray[p];
      if (invert) val = 255 - val;
      d[i] = d[i + 1] = d[i + 2] = val;
    }
    ctx.putImageData(img, 0, 0);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? image), 'image/png'));
  } catch {
    return image;
  }
}

/** تقدير جودة القراءة: نسبة الكلمات العربية المعقولة إلى كل المقاطع */
export function estimateOcrQuality(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const good = tokens.filter((t) => /^[ء-يً-ْٰ«»"،.:؛!؟()ﷺ]+$/.test(t) && t.replace(/[^ء-ي]/g, '').length >= 2);
  return good.length / tokens.length;
}

/** تنظيف خفيف لمخرجات OCR: رموز شاردة وأسطر فارغة، دون تغيير الكلمات العربية */
export function cleanOcrText(text: string): string {
  return text
    .split('\n')
    .map((l) =>
      l
        .replace(/[<>+=|_~^`{}\[\]\\/*#@$%&]/g, ' ')
        .replace(/(^|\s)[A-Za-z]{1,2}(?=\s|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((l) => l.replace(/[^ء-ي0-9٠-٩]/g, '').length >= 2)
    .join('\n');
}

export class TesseractOcrService implements OcrService {
  async recognize(image: File | Blob, onProgress?: (p: OcrProgress) => void): Promise<OcrResult> {
    const { createWorker } = await import('tesseract.js');
    let pass = 0;
    const passes = VARIANTS.length + 1;
    const worker = await createWorker('ara', 1, {
      logger: (m: { status: string; progress: number }) => {
        // التقدّم الكلي عبر كل المحاولات
        const prog = m.status.includes('recogniz') ? (pass + m.progress) / passes : m.progress;
        onProgress?.({ status: m.status, progress: Math.min(1, prog) });
      },
    });
    try {
      await worker.setParameters({ preserve_interword_spaces: '1' });
      let bestText = '';
      let bestScore = -1;
      const consider = (raw: string, conf: number) => {
        const text = cleanOcrText(raw);
        const q = estimateOcrQuality(text);
        // نفضّل القراءة التي كلماتها عربية معقولة، ثم ثقة المحرك، ثم طول النص
        const words = text.split(/\s+/).filter(Boolean).length;
        const score = q * 0.65 + (conf / 100) * 0.25 + Math.min(words, 12) / 12 * 0.1;
        if (score > bestScore) {
          bestScore = score;
          bestText = text;
        }
        return q;
      };
      for (const v of VARIANTS) {
        const prepared = await preprocess(image, v);
        const { data } = await worker.recognize(prepared);
        pass++;
        const q = consider(data.text, data.confidence ?? 0);
        if (q >= 0.85 && bestText.split(/\s+/).length >= 3) break;
      }
      if (estimateOcrQuality(bestText) < 0.85) {
        const { data } = await worker.recognize(image);
        consider(data.text, data.confidence ?? 0);
      }
      return { text: bestText, quality: estimateOcrQuality(bestText) };
    } finally {
      await worker.terminate();
    }
  }
}

export const ocrService: OcrService = new TesseractOcrService();

/** هل القراءة بالذكاء الاصطناعي مفعّلة في الخادم؟ */
export async function aiOcrAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/ocr', { cache: 'no-store' });
    if (!res.ok) return false;
    return Boolean((await res.json())?.enabled);
  } catch {
    return false;
  }
}

/** تصغير الصورة إلى JPEG مناسب للإرسال */
async function toJpegBase64(image: File | Blob, max = 1400): Promise<string> {
  const bitmap = await createImageBitmap(image);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.9);
  return url.slice(url.indexOf(',') + 1);
}

/** ذاكرة مؤقتة: الصورة نفسها لا تُرسل مرتين، فلا تُستهلك الحصة المجانية بلا داعٍ */
const aiCache = new Map<string, OcrResult>();

/** القراءة بنموذج رؤية — بطلب صريح من المستخدم فقط */
export async function aiOcr(image: File | Blob): Promise<OcrResult> {
  const f = image as File;
  const key = `${f.name ?? ''}|${image.size}|${f.lastModified ?? ''}`;
  const hit = aiCache.get(key);
  if (hit) return hit;
  const result = await aiOcrFetch(image);
  aiCache.set(key, result);
  return result;
}

async function aiOcrFetch(image: File | Blob): Promise<OcrResult> {
  const data = await toJpegBase64(image);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data, type: 'image/jpeg' }),
  });
  if (res.status !== 200) throw new Error(`ai_ocr_${res.status}`);
  const body = await res.json();
  const text = cleanOcrText(String(body?.text ?? ''));
  if (!text) throw new Error('ai_ocr_empty');
  return { text, quality: estimateOcrQuality(text) };
}
