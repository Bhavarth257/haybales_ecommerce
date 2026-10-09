'use client';
import type { Listing } from '@parali/shared';
import Link from 'next/link';
import { perTonne, tonnes } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { StatusBadge } from '../ui';

/** "2025-10" -> "Oct 2025". */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ym;
};

/** One tappable row on the dashboard: crop + form, status, tonnes left and price. */
export function ListingRow({ l }: { l: Listing }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/farmer/listing/?id=${l.listingId}`}
      className="flex min-h-12 flex-col gap-2 rounded-card border border-line bg-surface p-4 transition-colors hover:border-ink/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-semibold">
          {t(`common.crops.${l.crop}`)} · {t(`common.forms.${l.form}`)}
        </span>
        <StatusBadge kind="listing" status={l.status} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-muted">
        <span>{t('farmer.dash.left', { left: tonnes(l.tonnesLeft), total: tonnes(l.tonnes) })}</span>
        <span className="font-semibold text-ink">{perTonne(l.pricePerTonne)}</span>
      </div>
      <span className="text-sm text-muted">
        {l.place.village ? `${l.place.village}, ` : ''}
        {l.place.district} · {monthLabel(l.harvestDate)}
      </span>
    </Link>
  );
}
