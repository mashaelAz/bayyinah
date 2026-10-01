import dataset from '../../data/hadiths.json';
import type { SourceRecord } from '../types.ts';

/** يُحمَّل في بيئة Next.js فقط؛ الاختبارات تقرأ الملف مباشرة */
export const demoRecords: SourceRecord[] = (dataset as { records: SourceRecord[] }).records;
