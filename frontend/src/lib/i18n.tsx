'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ElementType, type ReactNode } from 'react';
import { EN, loadMessages, LOCALES, type Locale, type Messages } from '../messages';

const KEY = 'ps.locale';

function lookup(msgs: Messages, key: string): string | undefined {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), msgs);
  return typeof v === 'string' ? v : undefined;
}
const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s);

type Vars = Record<string, string | number>;
interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translated string (falls back to English, then the key). */
  t: (key: string, vars?: Vars) => string;
  /** English string, used for the subtitle line. */
  en: (key: string, vars?: Vars) => string;
}
const Ctx = createContext<I18n | null>(null);

// Locale lives in localStorage; useSyncExternalStore keeps the static HTML ('en') and the client in sync.
const listeners = new Set<() => void>();
const readLocale = (): Locale => {
  try {
    const saved = localStorage.getItem(KEY) as Locale | null;
    return saved && LOCALES.some((l) => l.code === saved) ? saved : 'en';
  } catch {
    return 'en';
  }
};
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => 'en' as Locale);
  const [loaded, setLoaded] = useState<{ locale: Locale; msgs: Messages }>({ locale: 'en', msgs: EN });
  const msgs = loaded.locale === locale ? loaded.msgs : EN;

  useEffect(() => {
    let live = true;
    document.documentElement.lang = locale;
    loadMessages(locale).then((m) => live && setLoaded({ locale, msgs: m }));
    return () => {
      live = false;
    };
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    listeners.forEach((fn) => fn());
  }, []);
  const en = useCallback((key: string, vars?: Vars) => fill(lookup(EN, key) ?? key, vars), []);
  const t = useCallback((key: string, vars?: Vars) => fill(lookup(msgs, key) ?? lookup(EN, key) ?? key, vars), [msgs]);
  const value = useMemo(() => ({ locale, setLocale, t, en }), [locale, setLocale, t, en]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n outside I18nProvider');
  return c;
}

/**
 * Translated text for headings, titles and buttons. In a non-English locale it adds the
 * English original underneath as a faint subtitle (product rule). Use t() for body text.
 */
export function Tx({ k, vars, as: As = 'span', className }: { k: string; vars?: Vars; as?: ElementType; className?: string }) {
  const { locale, t, en } = useI18n();
  const text = t(k, vars);
  const english = en(k, vars);
  return (
    <As className={className}>
      {text}
      {locale !== 'en' && english !== text && (
        <span className="en-sub" lang="en">
          {english}
        </span>
      )}
    </As>
  );
}
