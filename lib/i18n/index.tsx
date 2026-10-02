'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ar, type MessageKey, type Messages } from './ar.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';
import { ur } from './ur.ts';
import { id } from './id.ts';
import { tr } from './tr.ts';

export type Lang = 'ar' | 'en' | 'fr' | 'ur' | 'id' | 'tr';

export const LANGS: { code: Lang; name: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
];

const DICTS: Record<Lang, Messages> = { ar, en, fr, ur, id, tr };
const STORAGE_KEY = 'bayyinah:lang';

export type Params = Record<string, string | number>;
export type T = (key: MessageKey, params?: Params) => string;

function format(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  return format(DICTS[lang][key] ?? ar[key] ?? key, params);
}

function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGS.some((l) => l.code === v);
}

interface Ctx {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  t: T;
}

const I18nContext = createContext<Ctx>({
  lang: 'ar',
  dir: 'rtl',
  setLang: () => undefined,
  t: (k, p) => translate('ar', k, p),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  // اللغة من الرابط (?lang=) ثم من اختيار سابق محفوظ في المتصفح
  useEffect(() => {
    let initial: Lang | null = null;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('lang');
      if (isLang(fromUrl)) initial = fromUrl;
      if (!initial) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (isLang(saved)) initial = saved;
      }
    } catch {
      /* التخزين غير متاح */
    }
    if (initial) setLangState(initial);
  }, []);

  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'rtl';

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = dir;
    el.dataset.lang = lang;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* التخزين غير متاح */
    }
  }, []);

  const t = useCallback<T>((key, params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  return useContext(I18nContext);
}

/**
 * توضيح مختصر لأشهر ألفاظ الأحكام في الواجهات غير العربية.
 * يظهر بجانب الحكم العربي المنقول ولا يحل محله؛ ولا يُعرض إلا إذا كان الحكم كلمة واحدة من هذه بالضبط.
 */
const GLOSS: Partial<Record<Lang, Record<string, string>>> = {
  en: { صحيح: 'ṣaḥīḥ: authentic', حسن: 'ḥasan: good', ضعيف: 'ḍaʿīf: weak', موضوع: 'mawḍūʿ: fabricated' },
  fr: { صحيح: 'ṣaḥīḥ : authentique', حسن: 'ḥasan : bon', ضعيف: 'ḍaʿīf : faible', موضوع: 'mawḍūʿ : forgé' },
  id: { صحيح: 'sahih', حسن: 'hasan', ضعيف: 'dhaif (lemah)', موضوع: 'maudhu (palsu)' },
  tr: { صحيح: 'sahih', حسن: 'hasen', ضعيف: 'zayıf', موضوع: 'mevzû (uydurma)' },
};

export function gradeGloss(lang: Lang, grade: string | null | undefined): string | null {
  if (!grade) return null;
  const key = grade.replace(/[ً-ٰٟ]/g, '').trim();
  return GLOSS[lang]?.[key] ?? null;
}
