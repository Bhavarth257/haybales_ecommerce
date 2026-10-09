'use client';
import { Tx, useI18n } from '../../lib/i18n';
import { scrollBehavior } from '../../lib/motion';
import { Button } from './Button';

/**
 * Paged forms for phones: one step per screen with Back / Continue.
 * Put it inside a <form>; "Continue" is a submit button so the browser validates the current
 * step's required fields first. The form's onSubmit should call `next()` until the last step.
 */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-semibold text-muted">{t('common.steps.of', { n: step + 1, total })}</p>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-field' : 'bg-line'}`} />
        ))}
      </div>
    </div>
  );
}

export function StepButtons({ step, total, onBack, busy, disabled, finalKey }: { step: number; total: number; onBack: () => void; busy?: boolean; disabled?: boolean; finalKey: string }) {
  const last = step === total - 1;
  return (
    <div className="step-bar sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      {step > 0 && (
        <Button type="button" variant="secondary" onClick={onBack} className="flex-1 sm:flex-none">
          <Tx k="common.steps.back" />
        </Button>
      )}
      <Button type="submit" loading={busy} disabled={disabled} className="flex-[2] sm:ml-auto sm:flex-none">
        <Tx k={last ? finalKey : 'common.steps.next'} />
      </Button>
    </div>
  );
}

/** Move to a step and bring its top into view (no long scrolls on phones). */
export const goToStep = (set: (n: number) => void, n: number) => {
  set(n);
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
  // Move focus to the new step's heading so screen readers announce the change.
  requestAnimationFrame(() => {
    const h = document.querySelector<HTMLElement>('main form h2');
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  });
};
