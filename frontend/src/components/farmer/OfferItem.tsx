'use client';
import type { Offer, Order } from '@parali/shared';
import { useState } from 'react';
import { api } from '../../lib/api';
import { date, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';
import { Button, Field, Input, LinkButton, StatusBadge } from '../ui';

type Action = 'accept' | 'reject' | 'counter';

/** One buyer offer with the farmer's choices: accept, reject or ask a better price. */
export function OfferItem({
  offer,
  askingPrice,
  onDone,
}: {
  offer: Offer;
  askingPrice: number;
  onDone: (msg: { text: string; orderId?: string }) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  // Midway between their offer and my asking price, rounded to ₹10.
  const [counter, setCounter] = useState(String(Math.round((offer.pricePerTonne + Math.max(askingPrice, offer.pricePerTonne)) / 20) * 10));

  const vars = { buyer: offer.buyerName, tonnes: tonnes(offer.tonnes), price: perTonne(offer.pricePerTonne) };

  const act = async (action: Action) => {
    if (action === 'accept' && !confirm(t('farmer.listing.acceptConfirm', vars))) return;
    if (action === 'reject' && !confirm(t('farmer.listing.rejectConfirm', vars))) return;
    setBusy(action);
    setError(null);
    try {
      const body = action === 'counter' ? { action, counterPrice: Math.round(Number(counter)) } : { action };
      const res = await api<Offer | { offer: Offer; order: Order }>(`/listings/${offer.listingId}/offers/${offer.offerId}`, { method: 'PATCH', body });
      if ('order' in res) onDone({ text: t('farmer.listing.accepted'), orderId: res.order.orderId });
      else onDone({ text: action === 'counter' ? t('farmer.listing.counterSent') : '' });
    } catch (e) {
      setError((e as Error).message || t('common.errors.generic'));
      setBusy(null);
    }
  };

  const pending = offer.status === 'PENDING';
  return (
    <li className={`rounded-card border bg-surface p-4 ${pending ? 'border-2 border-straw' : 'border-line'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-lg font-semibold">{t('farmer.listing.offerFrom', vars)}</p>
        {/* "Waiting for farmer" reads oddly to the farmer; the straw border already marks it. */}
        {!pending && <StatusBadge kind="offer" status={offer.status} />}
      </div>
      <p className="mt-1 font-display text-2xl leading-tight">{t('farmer.listing.offered', { price: perTonne(offer.pricePerTonne) })}</p>
      <p className="text-sm text-muted">
        {t('farmer.listing.offerTotal', { amount: rupees(offer.tonnes * offer.pricePerTonne) })} · {date(offer.createdAt)}
      </p>
      {offer.counterPrice != null && <p className="mt-1 font-semibold">{t('farmer.listing.yourCounter', { price: perTonne(offer.counterPrice) })}</p>}
      {offer.message && <p className="mt-2 italic">“{offer.message}”</p>}

      {error && (
        <p className="mt-3 text-ember" role="alert">
          {error}
        </p>
      )}

      {pending && !countering && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button full className="col-span-2" loading={busy === 'accept'} disabled={!!busy} onClick={() => act('accept')}>
            <Tx k="farmer.listing.accept" />
          </Button>
          <Button variant="secondary" full disabled={!!busy} onClick={() => setCountering(true)}>
            <Tx k="farmer.listing.counter" />
          </Button>
          <Button variant="danger" full loading={busy === 'reject'} disabled={!!busy} onClick={() => act('reject')}>
            <Tx k="farmer.listing.reject" />
          </Button>
        </div>
      )}

      {pending && countering && (
        <form className="mt-4 space-y-3" onSubmit={(e) => (e.preventDefault(), act('counter'))}>
          <Field label={t('farmer.listing.counterPrice')}>
            {(p) => <Input {...p} autoFocus required type="number" inputMode="numeric" min={100} max={20000} step={1} value={counter} onChange={(e) => setCounter(e.target.value)} />}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" full disabled={!!busy} onClick={() => setCountering(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" full loading={busy === 'counter'}>
              <Tx k="farmer.listing.counterSend" />
            </Button>
          </div>
        </form>
      )}

      {offer.status === 'ACCEPTED' && offer.orderId && (
        <div className="mt-3">
          <LinkButton href={`/order/?id=${offer.orderId}`} variant="secondary" full>
            <Tx k="farmer.listing.viewOrder" />
          </LinkButton>
        </div>
      )}
    </li>
  );
}
