import { LocalProvider } from './local.ts';
import { BrowserDorarProvider, ServerDorarProvider } from './browser.ts';
import { loadCollected } from './manual.ts';
import type { HadithProvider } from './types.ts';
import type { SourceRecord } from '../types.ts';

/**
 * ترتيب المزوّدات في المتصفح، يُجرَّب كل واحد إذا تعذّر الذي قبله:
 *   1) الدرر السنية مباشرة من متصفح المستخدم
 *   2) الدرر السنية عبر خادم بيّنة
 *   3) مصادر محلية: متون الكتب الستة + سجلات منسوخة من الدرر (تُعلَّم بوضوح؛ و«لم نعثر» تعني: ليس في الكتب الستة)
 */
export function browserProviders(demoRecords: SourceRecord[]): HadithProvider[] {
  // النسخة المخزنة = السجلات المرفقة بالموقع + ما جلبه المستخدم من الدرر عبر «جسر الدرر»
  const seen = new Set(demoRecords.map((r) => r.id));
  const extra = loadCollected().filter((r) => !seen.has(r.id));
  return [new BrowserDorarProvider(), new ServerDorarProvider(), new LocalProvider([...demoRecords, ...extra])];
}
