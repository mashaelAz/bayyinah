import type { ResultStatus, VerificationResult } from './types.ts';

/** سجل عمليات التحقق في متصفح المستخدم فقط (Local Storage). لا حسابات ولا خادم. */

const KEY = 'bayyinah:history:v1';
const MAX = 50;

export interface HistoryEntry {
  id: string;
  text: string;
  status: ResultStatus;
  source: string | null;
  grade: string | null;
  differencePercent: number | null;
  at: string;
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(r: VerificationResult): void {
  try {
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      text: r.extraction.searchText.slice(0, 220),
      status: r.status,
      source: r.quran
        ? `القرآن الكريم، ${r.quran.surahName}: ${r.quran.from}${r.quran.to > r.quran.from ? `–${r.quran.to}` : ''}`
        : r.best
          ? `${r.best.record.scholar}، ${r.best.record.source}`
          : null,
      grade: r.best?.record.grade || null,
      differencePercent: r.diff?.differencePercent ?? null,
      at: r.checkedAt,
    };
    const list = [entry, ...readHistory()].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* التخزين غير متاح؛ نتجاهل دون كسر التجربة */
  }
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* تجاهل */
  }
}
