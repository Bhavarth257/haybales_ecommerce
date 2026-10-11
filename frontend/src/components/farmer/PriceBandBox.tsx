'use client';
import type { Place, PriceBand } from '@parali/shared';
import { useApi } from '../../hooks/useApi';
import { km, perTonne, rupees } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';
import { Button } from '../ui';

/** Fair price band for the farmer's place, shown next to the price input. */
export function PriceBandBox({ place, onUse }: { place: Partial<Place>; onUse: (price: number) => void }) {
  const { t } = useI18n();
  const ready = place.state && place.lat != null && place.lng != null;
  const path = ready ? `/price-band?${new URLSearchParams({ state: place.state!, lat: String(place.lat), lng: String(place.lng) })}` : null;
  const { data, error, loading } = useApi<PriceBand>(path);

  if (!ready) return <p className="text-muted">{t('farmer.new.priceNeedPlace')}</p>;
  if (loading) return <p className="text-muted" role="status">{t('farmer.new.bandLoading')}</p>;
  if (error || !data) return <p className="text-muted">{t('farmer.new.bandError')}</p>;

  return (
    <div className="rounded-card border border-field/25 bg-field-soft p-4" aria-live="polite">
      <p className="text-sm font-semibold text-field-strong">
        <Tx k="farmer.new.bandTitle" />
      </p>
      <p className="mt-1 font-display text-2xl leading-tight">{t('farmer.new.bandRange', { min: rupees(data.min), max: rupees(data.max) })}</p>
      <p className="mt-1 font-semibold">{t('farmer.new.bandSuggested', { price: perTonne(data.suggested) })}</p>
      <p className="mt-1 text-sm text-muted">
        {data.nearestBuyerKm != null ? t('farmer.new.bandNearest', { km: km(data.nearestBuyerKm) }) : t('farmer.new.bandNoBuyer')}
      </p>
      <Button type="button" variant="secondary" full className="mt-3" onClick={() => onUse(data.suggested)}>
        <Tx k="farmer.new.useSuggested" vars={{ price: perTonne(data.suggested) }} />
      </Button>
    </div>
  );
}
