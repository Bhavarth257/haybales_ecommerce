'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { HOME, useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';
import { LOCALES, type Locale } from '../../messages';

function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  const select = useRef<HTMLSelectElement>(null);
  // A label only focuses the select; open its list too when the globe is tapped (showPicker is newer, so guarded).
  const open = (e: React.MouseEvent) => {
    if (e.target === select.current) return;
    try {
      select.current?.showPicker?.();
    } catch {}
  };
  return (
    // One pill: the globe and the select share a label, so tapping the globe focuses the select.
    <label className="flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-line bg-surface pl-2.5 pr-1 text-sm focus-within:border-field focus-within:ring-2 focus-within:ring-field/25" onClick={open}>
      <span className="sr-only">{t('common.language')}</span>
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>
      <select ref={select} value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="min-h-10 cursor-pointer bg-transparent pr-1 text-sm focus:outline-none">
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Navbar() {
  const { me, logout } = useAuth();
  const path = usePathname();
  const link = (href: string, k: string) => (
    <Link
      href={href}
      aria-current={path === href || (href !== '/' && path.startsWith(href.replace(/\/$/, ''))) ? 'page' : undefined}
      className="whitespace-nowrap rounded-lg px-3 py-2 font-semibold text-ink hover:bg-field-soft aria-[current=page]:text-field aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
    >
      <Tx k={k} />
    </Link>
  );
  return (
    <header className="material-bar sticky top-0 z-20">
      {/* Phone: logo + language + account on row 1, page links on row 2. Desktop: one row. */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2 sm:gap-x-2">
        <Link href="/" className="mr-auto flex items-center gap-2 py-1">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#2f5d34" />
            <path d="M6 21c5-6 15-6 20 0" stroke="#d9a43b" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M9 21v4M23 21v4M16 17v8" stroke="#f7f3ea" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="font-display text-xl font-semibold">Parali Setu</span>
        </Link>
        <div className="order-last -mx-2 flex w-full gap-1 sm:order-none sm:mx-0 sm:w-auto">
          {link('/listings/', 'common.nav.browse')}
          {me && link(HOME[me.role], `common.nav.${me.role}`)}
          {/* Phone row 2 has room for one more link: Profile (Log out lives on the profile page). */}
          {me && link('/profile/', 'common.nav.profile')}
        </div>
        <LanguagePicker />
        {me ? (
          <button onClick={logout} className="hidden min-h-10 rounded-lg px-3 py-2 font-semibold text-muted hover:bg-field-soft sm:inline-block">
            <Tx k="common.nav.logout" />
          </button>
        ) : (
          <Link href="/login/" className="min-h-10 rounded-lg bg-field px-4 py-2 font-semibold text-white hover:bg-field-strong">
            <Tx k="common.nav.login" />
          </Link>
        )}
      </nav>
    </header>
  );
}
