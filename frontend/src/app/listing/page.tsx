'use client';
import { scrollBehavior } from '../../lib/motion';
import type { Listing, PriceBand } from '@parali/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { OfferForm } from '../../components/buyer/OfferForm';
import { monthLabel } from '../../components/farmer/ListingSummary';
import { Button, Card, ErrorBox, Loading, StatusBadge, Tabs } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { photoUrl } from '../../lib/config';
import { useAuth } from '../../lib/auth';
import { km, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function FairBand({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { state, lat, lng } = listing.place;
  const { data } = useApi<PriceBand>(`/price-band?${new URLSearchParams({ state, lat: String(lat), lng: String(lng) })}`, { auth: false });
  if (!data) return null;
  const p = listing.pricePerTonne;
  const verdict = p < data.min ? 'fairBelow' : p > data.max ? 'fairAbove' : 'fairWithin';
  // Marker position on the band bar, padded so out-of-range prices still show at the ends.
  const lo = data.min * 0.8, hi = data.max * 1.2;
  const pos = (n: number) => `${Math.min(100, Math.max(0, ((n - lo) / (hi - lo)) * 100))}%`;
  return (
    <Card>
      <h2 className="font-display text-xl">
        <Tx k="buyer.detail.fairTitle" vars={{ state }} />
      </h2>
      <p className="mt-1 text-sm text-muted tabular-nums">
        {t('buyer.detail.fairRange', { min: rupees(data.min), max: rupees(data.max), suggested: perTonne(data.suggested) })}
      </p>
      <div className="relative mt-4 h-2 rounded-full bg-paper" aria-hidden>
        <div className="absolute inset-y-0 rounded-full bg-field-soft" style={{ left: pos(data.min), right: `calc(100% - ${pos(data.max)})` }} />
        <div className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-surface bg-field" style={{ left: pos(p) }} />
      </div>
      <p className="mt-3 text-sm">{t(`buyer.detail.${verdict}`)}</p>
    </Card>
  );
}

type Tab = 'details' | 'offer';

function ListingDetail() {
  const { t } = useI18n();
  const { me, loading: authLoading } = useAuth();
  const id = useSearchParams().get('id');
  // Pass the buyer's location so the server computes distance + transport (same numbers as search).
  const here = me?.place ? `?lat=${me.place.lat}&lng=${me.place.lng}` : '';
  const { data: l, error, loading, reload } = useApi<Listing>(id && !authLoading ? `/listings/${encodeURIComponent(id)}${here}` : null, { auth: false });
  const [tab, setTab] = useState<Tab>('details');

  if (!id) return <ErrorBox message={t('common.errors.generic')} />;
  if (error)
    return (
      <div className="space-y-4">
        <ErrorBox message={error} onRetry={reload} />
        <Link href="/listings/" className="-ml-2 inline-flex min-h-12 items-center rounded-lg px-2 font-semibold text-field hover:bg-field-soft">
          ← <Tx k="buyer.detail.back" className="ml-1" />
        </Link>
      </div>
    );
  if (loading || !l) return <Loading />;

  const photos = (l.photos ?? []).map(photoUrl).filter(Boolean);
  const dist = l.distanceKm ?? null;
  const transport = l.transportPerTonne ?? null;
  // Farmers/admins get no offer form, so there is nothing to switch to.
  const canOffer = !authLoading && (!me || me.role === 'buyer');
  const openOffer = () => {
    setTab('offer');
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  return (
    <>
      <Link href="/listings/" className="-ml-2 mb-2 inline-flex min-h-12 items-center rounded-lg px-2 font-semibold text-field hover:bg-field-soft">
        ← <Tx k="buyer.detail.back" className="ml-1" />
      </Link>

      <header className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">
              <Tx k="buyer.detail.title" vars={{ crop: t('common.crops.' + l.crop) }} />
            </h1>
            <p className="mt-0.5 text-muted">
              {l.place.district}, {l.place.state}
              {dist != null && ` · ${t('buyer.card.away', { km: km(dist) })}`}
            </p>
          </div>
          <StatusBadge kind="listing" status={l.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
          <div className="col-span-2 bg-surface p-4">
            {transport != null ? (
              <>
                <p className="text-sm text-muted">{t('buyer.detail.deliveredEst')}</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {rupees(l.pricePerTonne + transport)}
                  <span className="ml-1 text-base font-normal text-muted">{t('buyer.card.perTonne')}</span>
                </p>
                <p className="text-sm text-muted tabular-nums">{t('buyer.card.breakdown', { price: rupees(l.pricePerTonne), transport: rupees(transport) })}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">{t('buyer.detail.asking')}</p>
                <p className="text-3xl font-semibold tabular-nums">{perTonne(l.pricePerTonne)}</p>
              </>
            )}
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-sm text-muted">{t('buyer.detail.available')}</p>
            <p className="font-semibold tabular-nums">{tonnes(l.tonnesLeft)}</p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="text-sm text-muted">{t('buyer.detail.form')}</p>
            <p className="font-semibold">{t('common.forms.' + l.form)}</p>
          </div>
        </div>
      </header>

      {canOffer && (
        <div className="lg:hidden">
          <Tabs<Tab>
            tabs={[
              { key: 'details', label: <Tx k="buyer.detail.tabDetails" /> },
              { key: 'offer', label: <Tx k="buyer.detail.offerTitle" /> },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div role={canOffer ? 'tabpanel' : undefined} className={`space-y-6 ${canOffer && tab !== 'details' ? 'hidden lg:block' : ''}`}>
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-2">
              {photos.map((src, i) => (
                <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-paper">
                  <Image src={src} alt={t('buyer.detail.photo', { n: i + 1 })} fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover" />
                </li>
              ))}
            </ul>
          )}

          <Card>
            <dl className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
              <Spec label={t('buyer.detail.available')}>
                {tonnes(l.tonnesLeft)} <span className="block text-sm font-normal text-muted">{t('buyer.detail.ofTotal', { t: tonnes(l.tonnes) })}</span>
              </Spec>
              <Spec label={t('buyer.detail.harvested')}>{monthLabel(l.harvestDate)}</Spec>
              {l.moisturePct != null && <Spec label={t('buyer.detail.moisture')}>{l.moisturePct}%</Spec>}
              <Spec label={t('buyer.detail.farmer')}>{l.farmerName}</Spec>
              <Spec label={t('buyer.detail.location')}>
                {l.place.district}, {l.place.state}
              </Spec>
              <Spec label={t('buyer.detail.asking')}>{perTonne(l.pricePerTonne)}</Spec>
            </dl>
            <p className="mt-2 border-t border-line pt-3 text-sm text-muted">{t('buyer.detail.locationHint')}</p>
          </Card>

          {l.notes && (
            <section>
              <h2 className="font-display text-xl">
                <Tx k="buyer.detail.notes" />
              </h2>
              <p className="mt-2 whitespace-pre-line">{l.notes}</p>
            </section>
          )}

          <FairBand listing={l} />

          {canOffer && (
            <div className="lg:hidden">
              <Button full onClick={openOffer}>
                <Tx k="buyer.detail.offerTitle" />
              </Button>
            </div>
          )}
        </div>

        <aside role={canOffer ? 'tabpanel' : undefined} className={`lg:sticky lg:top-24 ${canOffer && tab !== 'offer' ? 'hidden lg:block' : ''}`}>
          <OfferForm listing={l} />
        </aside>
      </div>
    </>
  );
}

export default function ListingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ListingDetail />
    </Suspense>
  );
}
