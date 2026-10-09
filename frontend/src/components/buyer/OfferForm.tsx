'use client';
import type { Listing, Offer } from '@parali/shared';
import { useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { perTonne, rupees, tonnes as fmtTonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';
import { Button, Card, ErrorBox, Field, Input, LinkButton, Textarea } from '../ui';

/** Offer box on the listing page: login prompt, location prompt, the form, or the sent state. */
export function OfferForm({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { me, loading } = useAuth();
  const [qty, setQty] = useState(String(Math.min(listing.tonnesLeft, 10)));
  const [price, setPrice] = useState(String(listing.pricePerTonne));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  if (loading || (me && me.role !== 'buyer')) return null;
  if (listing.status !== 'ACTIVE' || listing.tonnesLeft <= 0) return <Card>{t('buyer.detail.soldOut')}</Card>;

  const next = `/listing/?id=${encodeURIComponent(listing.listingId)}`;
  if (!me)
    return (
      <Card>
        <h2 className="font-display text-2xl">
          <Tx k="buyer.detail.offerTitle" />
        </h2>
        <p className="mt-1 text-muted">{t('buyer.detail.loginHint')}</p>
        <div className="mt-4">
          <LinkButton href={`/login/?next=${encodeURIComponent(next)}`} full>
            <Tx k="buyer.detail.loginToOffer" />
          </LinkButton>
        </div>
      </Card>
    );

  if (!me.place)
    return (
      <Card>
        <h2 className="font-display text-2xl">
          <Tx k="buyer.detail.offerTitle" />
        </h2>
        <p className="mt-1">{t('buyer.detail.needPlace')}</p>
        <div className="mt-4">
          <LinkButton href="/profile/" full>
            <Tx k="buyer.detail.addPlace" />
          </LinkButton>
        </div>
      </Card>
    );

  if (sent)
    return (
      <Card className="border-field/40">
        <h2 className="font-display text-2xl text-field">
          <Tx k="buyer.detail.sentTitle" />
        </h2>
        <p className="mt-1">{t('buyer.detail.sent')}</p>
        <div className="mt-4">
          <LinkButton href="/buyer/" variant="secondary" full>
            <Tx k="buyer.detail.goDashboard" />
          </LinkButton>
        </div>
      </Card>
    );

  const q = Number(qty);
  const p = Number(price);
  const qtyBad = !(q >= 0.5 && q <= listing.tonnesLeft);
  const priceBad = !(Number.isInteger(p) && p >= 100 && p <= 20000);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (qtyBad || priceBad) return;
    setBusy(true);
    setError(null);
    try {
      await api<Offer>(`/listings/${encodeURIComponent(listing.listingId)}/offers`, {
        body: { tonnes: q, pricePerTonne: p, ...(message.trim() ? { message: message.trim() } : {}) },
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-2xl">
        <Tx k="buyer.detail.offerTitle" />
      </h2>
      <p className="mt-1 text-muted">{t('buyer.detail.offerSub')}</p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('buyer.detail.tonnes')}
            hint={t('buyer.detail.tonnesHint', { max: fmtTonnes(listing.tonnesLeft) })}
            error={touched && qtyBad ? t('buyer.detail.tonnesError', { max: listing.tonnesLeft }) : undefined}
          >
            {(f) => <Input {...f} type="number" inputMode="decimal" min={0.5} max={listing.tonnesLeft} step={0.5} required value={qty} onChange={(e) => setQty(e.target.value)} />}
          </Field>
          <Field
            label={t('buyer.detail.price')}
            hint={t('buyer.detail.priceHint', { price: perTonne(listing.pricePerTonne) })}
            error={touched && priceBad ? t('buyer.detail.priceError') : undefined}
          >
            {(f) => <Input {...f} type="number" inputMode="numeric" min={100} max={20000} step={10} required value={price} onChange={(e) => setPrice(e.target.value)} />}
          </Field>
        </div>
        <Field label={t('buyer.detail.message')} hint={t('buyer.detail.messageHint')}>
          {(f) => <Textarea {...f} maxLength={500} placeholder={t('buyer.detail.messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        {!qtyBad && !priceBad && (
          <p className="rounded-xl bg-paper px-3.5 py-2.5 text-sm tabular-nums" aria-live="polite">
            {t('buyer.detail.stubbleCost', { total: rupees(q * p) })}
          </p>
        )}
        {error && <ErrorBox message={error} />}
        <Button type="submit" full loading={busy}>
          <Tx k="buyer.detail.send" />
        </Button>
      </form>
    </Card>
  );
}
