/**
 * طبقة التعرف الضوئي على الحروف (OCR).
 * التنفيذ الحالي: Tesseract.js بنموذج العربية، يعمل داخل متصفح المستخدم،
 * فلا تُرفع الصورة إلى أي خادم. يمكن استبداله بخدمة خارجية بتنفيذ الواجهة نفسها.
 */

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrService {
  recognize(image: File | Blob, onProgress?: (p: OcrProgress) => void): Promise<string>;
}

export class TesseractOcrService implements OcrService {
  async recognize(image: File | Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('ara', 1, {
      logger: (m: { status: string; progress: number }) => onProgress?.({ status: m.status, progress: m.progress }),
    });
    try {
      const { data } = await worker.recognize(image);
      return cleanOcrText(data.text);
    } finally {
      await worker.terminate();
    }
  }
}

/** تنظيف خفيف لمخرجات OCR: أسطر فارغة ومسافات زائدة فقط، دون تغيير الكلمات */
export function cleanOcrText(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export const ocrService: OcrService = new TesseractOcrService();
