import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-field text-white hover:bg-field-strong active:translate-y-px',
  secondary: 'bg-surface text-ink border border-line hover:border-ink/40',
  ghost: 'text-field hover:bg-field-soft',
  danger: 'bg-surface text-ember border border-ember/40 hover:bg-ember-soft',
};
/** 48px minimum height: comfortable thumb target on small phones. */
export const buttonClass = (variant: Variant = 'primary', full = false) =>
  `press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${full ? 'w-full' : ''}`;

export function Button({ variant = 'primary', full, loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={`${buttonClass(variant, full)} ${rest.className ?? ''}`}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', full, children }: { href: string; variant?: Variant; full?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, full)}>
      {children}
    </Link>
  );
}
