import { DemoProvider } from './demo.ts';
import { DorarProvider } from './dorar.ts';
import type { HadithProvider } from './types.ts';
import type { SourceRecord } from '../types.ts';

export type ProviderMode = 'auto' | 'dorar' | 'demo';

export interface ProviderChain {
  primary: HadithProvider;
  fallback: HadithProvider | null;
}

/**
 * اختيار المزوّد حسب HADITH_PROVIDER:
 *   auto  → الدرر مباشرة، مع النسخة المخزنة الموثقة بديلًا عند تعذر الاتصال
 *   dorar → الدرر مباشرة فقط
 *   demo  → النسخة المخزنة فقط
 */
export function getProviders(demoRecords: SourceRecord[], mode?: string): ProviderChain {
  const m = (mode || process.env.HADITH_PROVIDER || 'auto') as ProviderMode;
  const demo = new DemoProvider(demoRecords);
  if (m === 'demo') return { primary: demo, fallback: null };
  if (m === 'dorar') return { primary: new DorarProvider(), fallback: null };
  return { primary: new DorarProvider(), fallback: demo };
}
