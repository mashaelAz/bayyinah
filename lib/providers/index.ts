import { DemoProvider } from './demo.ts';
import { BrowserDorarProvider, ServerDorarProvider } from './browser.ts';
import type { HadithProvider } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * ترتيب المزوّدات في المتصفح، يُجرَّب كل واحد إذا تعذّر الذي قبله:
 *   1) الدرر السنية مباشرة من متصفح المستخدم
 *   2) الدرر السنية عبر خادم بيّنة
 *   3) نسخة مخزنة منسوخة من الدرر (تُعلَّم بوضوح، ولا تُبنى عليها «لم نعثر»)
 */
export function browserProviders(demoRecords: SourceRecord[]): HadithProvider[] {
  return [new BrowserDorarProvider(), new ServerDorarProvider(), new DemoProvider(demoRecords)];
}
