'use client';
import type { ReactNode } from 'react';
import { OFFLINE } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Button } from './Button';

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 py-10 text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-field border-t-transparent" aria-hidden />
      {t('common.actions.loading')}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-ember/30 bg-ember-soft p-4 text-ember" role="alert">
      <p>{message === OFFLINE ? t('common.errors.offline') : message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          {t('common.actions.retry')}
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
