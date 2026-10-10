'use client';
import Link from 'next/link';
import { Tx, useI18n } from '../../lib/i18n';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <p>{t('common.footer.madeFor')}</p>
        <nav className="flex flex-wrap gap-x-5">
          {(['help', 'privacy', 'terms'] as const).map((k) => (
            <Link key={k} href={`/${k}/`} className="inline-flex min-h-12 items-center font-semibold text-field underline-offset-4 hover:underline">
              <Tx k={`common.footer.${k}`} />
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
