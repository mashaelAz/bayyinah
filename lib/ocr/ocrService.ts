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

/** تحسين الصورة قبل القراءة */
async function preprocess(image: File | Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(image);
    const target = 1800;
    const scale = Math.min(3, Math.max(1, target / Math.max(bitmap.width, bitmap.height)));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return image;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    // تدرّج رمادي يعتمد على أغمق قناة لونية، فالنص الأحمر والأخضر يصير غامقًا مثل الأسود
    const gray = new Uint8ClampedArray(w * h);
    const hist = new Array(256).fill(0);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const v = Math.min(d[i], d[i + 1], d[i + 2]) * 0.6 + (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * 0.4;
      gray[p] = v;
      hist[Math.round(v)]++;
    }
    // عتبة Otsu لفصل النص عن الخلفية
    const total = w * h;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
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
    for (let p = 0; p < gray.length; p++) if (gray[p] < threshold) dark++;
    const invert = dark > total / 2;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let v = gray[p] < threshold ? 0 : 255;
      if (invert) v = 255 - v;
      d[i] = d[i + 1] = d[i + 2] = v;
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
    const worker = await createWorker('ara', 1, {
      logger: (m: { status: string; progress: number }) => onProgress?.({ status: m.status, progress: m.progress }),
    });
    try {
      const prepared = await preprocess(image);
      let { data } = await worker.recognize(prepared);
      let text = cleanOcrText(data.text);
      // إذا ساءت القراءة بعد التحسين، نجرّب الصورة الأصلية ونأخذ الأفضل
      if (estimateOcrQuality(text) < 0.6) {
        const second = await worker.recognize(image);
        const alt = cleanOcrText(second.data.text);
        if (estimateOcrQuality(alt) > estimateOcrQuality(text)) {
          data = second.data;
          text = alt;
        }
      }
      return { text, quality: estimateOcrQuality(text) };
    } finally {
      await worker.terminate();
    }
  }
}

export const ocrService: OcrService = new TesseractOcrService();
