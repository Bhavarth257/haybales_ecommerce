'use client';
import type { Listing } from '@parali/shared';
import { useState } from 'react';
import { api } from '../../lib/api';
import { tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';
import { Button, Card, ErrorBox, Field, Input } from '../ui';

/** Change price and total tonnes (partial PUT). */
export function EditListing({ listing, onSaved, onCancel }: { listing: Listing; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [price, setPrice] = useState(String(listing.pricePerTonne));
  const [qty, setQty] = useState(String(listing.tonnes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sold = listing.tonnes - listing.tonnesLeft;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/listings/${listing.listingId}`, { method: 'PUT', body: { pricePerTonne: Math.round(Number(price)), tonnes: Number(qty) } });
      onSaved();
    } catch (e) {
      setError((e as Error).message || t('common.errors.generic'));
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">
        <Tx k="farmer.listing.editTitle" />
      </h2>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label={t('farmer.new.price')}>
          {(p) => <Input {...p} required type="number" inputMode="numeric" min={100} max={20000} step={1} value={price} onChange={(e) => setPrice(e.target.value)} />}
        </Field>
        <Field label={t('farmer.listing.editTonnes')} hint={sold > 0 ? t('farmer.listing.editTonnesHint', { sold: tonnes(sold) }) : undefined}>
          {(p) => <Input {...p} required type="number" inputMode="decimal" min={Math.max(sold, 0.1)} max={10000} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />}
        </Field>
        {error && <ErrorBox message={error} />}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" full disabled={busy} onClick={onCancel}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" full loading={busy}>
            <Tx k="common.actions.save" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
