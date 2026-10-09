'use client';
import { useState, type ReactNode } from 'react';
import { Tx, useI18n } from '../../lib/i18n';
import { scrollBehavior } from '../../lib/motion';
import { Button } from './Button';

/** Client-side paging for lists on phones: a few items per page with Previous / Next (no endless scroll). */
export function usePaged<T>(items: T[], perPage = 5) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages - 1); // stays valid when the list shrinks
  return { pageItems: items.slice(current * perPage, current * perPage + perPage), page: current, pages, setPage };
}

export function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (n: number) => void }) {
  const { t } = useI18n();
  if (pages <= 1) return null;
  const go = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };
  return (
    <nav aria-label={t('common.pager.page', { n: page + 1, total: pages })} className="mt-6 flex items-center justify-between gap-3">
      <Button variant="secondary" disabled={page === 0} onClick={() => go(page - 1)}>
        <Tx k="common.pager.prev" />
      </Button>
      <span className="text-sm font-semibold text-muted">{t('common.pager.page', { n: page + 1, total: pages })}</span>
      <Button variant="secondary" disabled={page >= pages - 1} onClick={() => go(page + 1)}>
        <Tx k="common.pager.next" />
      </Button>
    </nav>
  );
}

/** Segmented control: show one section at a time instead of stacking long sections. */
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: ReactNode; count?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div role="group" className="mb-5 flex gap-1 rounded-xl border border-line bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={value === tab.key}
          onClick={() => onChange(tab.key)}
          className="press flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted aria-pressed:bg-field aria-pressed:text-white"
        >
          {tab.label}
          {tab.count ? <span className="rounded-full bg-straw px-1.5 text-xs text-ink">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
