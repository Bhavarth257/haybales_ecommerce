'use client';
import type { Listing } from '@parali/shared';
import Link from 'next/link';
import { km, perTonne, rupees, tonnes } from '../../lib/format';
import { useI18n } from '../../lib/i18n';

/** Browse card. With a known distance the headline price is the delivered cost per tonne. */
export function ListingCard({ listing: l }: { listing: Listing }) {
  const { t } = useI18n();
  const hasDelivery = l.distanceKm != null && l.transportPerTonne != null;
  return (
    <Link
      href={`/listing/?id=${encodeURIComponent(l.listingId)}`}
      className="reveal press group flex h-full flex-col rounded-card border border-line bg-surface p-4 hover:border-ink/30 hover:shadow-[0_8px_24px_-14px_rgb(28_27_23/0.35)] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-snug group-hover:text-field">
            {t('common.crops.' + l.crop)} · {t('common.forms.' + l.form)}
          </h2>
          <p className="mt-0.5 text-muted">
            {l.place.district}, {l.place.state}
          </p>
        </div>
        {hasDelivery && <span className="shrink-0 rounded-full bg-paper px-2.5 py-0.5 text-sm font-semibold text-muted">{l.distanceKm! < 5 ? t('buyer.card.nearby') : t('buyer.card.away', { km: km(l.distanceKm!) })}</span>}
      </div>

      <p className="mt-3 text-sm font-semibold text-ink">{t('buyer.card.available', { t: tonnes(l.tonnesLeft) })}</p>

      <div className="mt-auto pt-4">
        {hasDelivery ? (
          <div className="border-t border-line pt-3">
            <p className="text-sm text-muted">{t('buyer.card.delivered')}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {rupees(l.pricePerTonne + l.transportPerTonne!)}
              <span className="ml-1 text-base font-normal text-muted">{t('buyer.card.perTonne')}</span>
            </p>
            <p className="text-sm text-muted tabular-nums">
              {t('buyer.card.breakdown', { price: rupees(l.pricePerTonne), transport: rupees(l.transportPerTonne!) })}
            </p>
          </div>
        ) : (
          <div className="border-t border-line pt-3">
            <p className="text-sm text-muted">{t('buyer.card.asking')}</p>
            <p className="text-2xl font-semibold tabular-nums">{perTonne(l.pricePerTonne)}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
