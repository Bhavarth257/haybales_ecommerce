'use client';
import type { OrderStatus } from '@parali/shared';
import { useI18n } from '../../lib/i18n';

const STEPS: OrderStatus[] = ['AWAITING_TRANSPORT', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'PAID'];

/** Vertical step list; done steps get a tick, the current one is marked for screen readers. */
export function Timeline({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const at = STEPS.indexOf(status);
  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const done = i < at || (i === at && s === 'PAID');
        const current = i === at;
        return (
          <li key={s} className="relative flex gap-3 pb-4 last:pb-0" aria-current={current ? 'step' : undefined}>
            {i < STEPS.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${i < at ? 'bg-field' : 'bg-line'}`} aria-hidden />}
            <span
              className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                done ? 'border-field bg-field text-white' : current ? 'border-field bg-surface' : 'border-line bg-surface'
              }`}
              aria-hidden
            >
              {done ? (
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              ) : current ? (
                <span className="size-2 rounded-full bg-field" />
              ) : null}
            </span>
            <span className={current ? 'font-semibold' : i > at ? 'text-muted' : ''}>{t(`common.orderStatus.${s}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
