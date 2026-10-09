'use client';
import type { ImpactStats } from '@parali/shared';
import { useApi } from '../../hooks/useApi';
import { count, rupees } from '../../lib/format';
import { CountUp } from './CountUp';
import { useI18n, Tx } from '../../lib/i18n';
import { ErrorBox } from '../ui';

const API_OPTS = { auth: false } as const;

function Tile({ label, value, unit }: { label: string; value: React.ReactNode; unit: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <Tx k={label} as="p" className="text-sm font-semibold text-muted" />
      <p className="mt-2 break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl">{value}</p>
      <Tx k={unit} as="p" className="mt-1 text-sm text-muted" />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-hidden>
      <div className="h-44 animate-pulse rounded-card bg-field-soft md:row-span-2 md:h-auto" />
      <div className="grid grid-cols-2 gap-3 md:col-span-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-line/60" />
        ))}
      </div>
    </div>
  );
}

export function ImpactCounter() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi<ImpactStats>('/impact', API_OPTS);

  return (
    <section aria-label={t('landing.impact.title')} className="reveal mt-14 sm:mt-20 lg:mt-32">
      <Tx k="landing.eyebrow.impact" as="p" className="eyebrow mb-3" />
      <Tx k="landing.impact.title" as="h2" className="font-display text-3xl leading-tight sm:text-4xl" />
      <p className="mt-2 text-muted">{t('landing.impact.sub')}</p>

      <div className="mt-6" aria-live="polite" aria-busy={loading}>
        {loading && !data ? (
          <>
            <Skeleton />
            <span className="sr-only" role="status">
              {t('common.actions.loading')}
            </span>
          </>
        ) : error && !data ? (
          <ErrorBox message={t('landing.impact.error')} onRetry={reload} />
        ) : data ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-card bg-field p-5 text-white sm:p-6 md:row-span-2">
              <Tx k="landing.impact.tonnes" as="p" className="font-semibold text-white/90" />
              <div className="mt-6">
                <p className="text-6xl font-semibold leading-none sm:text-7xl"><CountUp value={data.tonnes} format={count} /></p>
                <Tx k="landing.impact.tonnesUnit" as="p" className="mt-2 text-white/90" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <Tile label="landing.impact.co2" value={<CountUp value={data.co2Tonnes} format={count} />} unit="landing.impact.co2Unit" />
              <Tile label="landing.impact.pm25" value={<CountUp value={data.pm25Kg} format={count} />} unit="landing.impact.pm25Unit" />
              <Tile label="landing.impact.farmers" value={<CountUp value={data.farmersPaid} format={count} />} unit="landing.impact.farmersUnit" />
              <Tile label="landing.impact.rupees" value={<CountUp value={data.rupeesToFarmers} format={rupees} />} unit="landing.impact.rupeesUnit" />
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 max-w-[70ch] text-sm text-muted">
        <span className="font-semibold text-ink">{t('landing.impact.sourcesTitle')}. </span>
        {t('landing.impact.sources')}
      </p>
    </section>
  );
}
