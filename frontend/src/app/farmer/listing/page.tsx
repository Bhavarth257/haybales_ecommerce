'use client';
import type { Listing, Offer } from '@parali/shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { EditListing } from '../../../components/farmer/EditListing';
import { monthLabel } from '../../../components/farmer/ListingSummary';
import { OfferItem } from '../../../components/farmer/OfferItem';
import { RequireRole } from '../../../components/layout/RequireRole';
import { Button, Card, Empty, ErrorBox, LinkButton, Loading, PageHeader, Pager, StatusBadge, Tabs, usePaged } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { photoUrl } from '../../../lib/config';
import { perTonne, tonnes } from '../../../lib/format';
import { Tx, useI18n } from '../../../lib/i18n';

type Items<T> = { items: T[] };
type Flash = { text: string; orderId?: string } | null;
type TabKey = 'offers' | 'details';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'good' | 'warn' | 'neutral'; children: ReactNode }) {
  const cls = { good: 'border-field/25 bg-field-soft text-field-strong', warn: 'border-straw/40 bg-straw-soft text-[#6b4a0c]', neutral: 'border-line bg-surface text-muted' }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`} role="status">
      {children}
    </div>
  );
}

function ListingView() {
  const { t } = useI18n();
  const params = useSearchParams();
  const id = params.get('id');
  const listings = useApi<Items<Listing>>(id ? '/me/listings' : null);
  const offers = useApi<Items<Offer>>(id ? `/listings/${encodeURIComponent(id)}/offers` : null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(params.get('new') ? { text: t('farmer.new.created') } : null);
  const [chosenTab, setChosenTab] = useState<TabKey | null>(null);

  // Offers waiting for a reply come first, newest first within each group.
  const sorted = [...(offers.data?.items ?? [])].sort(
    (a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || b.createdAt.localeCompare(a.createdAt),
  );
  const paged = usePaged(sorted, 5);
  const pendingCount = sorted.filter((o) => o.status === 'PENDING').length;
  // Until the farmer picks a tab: open Offers when some wait for a reply (or are still loading), else Details.
  const tab: TabKey = chosenTab ?? (!offers.data || pendingCount > 0 ? 'offers' : 'details');

  const back = (
    <Link href="/farmer/" className="press -ml-2 inline-flex min-h-12 items-center gap-1 rounded-xl px-2 font-semibold text-field active:bg-field-soft">
      ← {t('farmer.listing.backToFarm')}
    </Link>
  );
  if (listings.loading && !listings.data) return <Loading />;
  if (listings.error) return <ErrorBox message={listings.error} onRetry={listings.reload} />;
  const l = listings.data?.items.find((x) => x.listingId === id);
  if (!l)
    return (
      <div className="space-y-4">
        <ErrorBox message={t('farmer.listing.missing')} />
        {back}
      </div>
    );

  const reload = () => (listings.reload(), offers.reload());
  const setStatus = async (close: boolean) => {
    if (close && !confirm(t('farmer.listing.closeConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      if (close) await api(`/listings/${l.listingId}`, { method: 'DELETE' });
      else await api(`/listings/${l.listingId}`, { method: 'PUT', body: { status: 'ACTIVE' } });
      setFlash(null);
      reload();
    } catch (e) {
      setError((e as Error).message || t('common.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const canEdit = l.status === 'ACTIVE' || l.status === 'PENDING_APPROVAL' || l.status === 'CLOSED';
  const canClose = l.status === 'ACTIVE' || l.status === 'SOLD_OUT';
  const canReopen = l.status === 'CLOSED' && !!l.approvedAt;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {back}
      <PageHeader
        title={
          <>
            {t(`common.crops.${l.crop}`)} · {t(`common.forms.${l.form}`)}
          </>
        }
        sub={`${l.place.village ? `${l.place.village}, ` : ''}${l.place.district}, ${l.place.state}`}
        action={<StatusBadge kind="listing" status={l.status} />}
      />

      {flash && (
        <Notice tone="good">
          <p>{flash.text}</p>
          {flash.orderId && (
            <div className="mt-3">
              <LinkButton href={`/order/?id=${flash.orderId}`}>
                <Tx k="farmer.listing.viewOrder" />
              </LinkButton>
            </div>
          )}
        </Notice>
      )}
      {l.status === 'PENDING_APPROVAL' && <Notice tone="warn">{t('farmer.listing.pending')}</Notice>}
      {l.status === 'REJECTED' && <Notice tone="warn">{t('farmer.listing.rejected')}</Notice>}
      {l.status === 'CLOSED' && <Notice tone="neutral">{t('farmer.listing.closedNote')}</Notice>}
      {error && <ErrorBox message={error} />}

      <div>
        <Tabs<TabKey>
          value={tab}
          onChange={setChosenTab}
          tabs={[
            { key: 'offers', label: <Tx k="farmer.listing.tabOffers" />, count: pendingCount },
            { key: 'details', label: <Tx k="farmer.listing.details" /> },
          ]}
        />
        <div role="tabpanel" aria-label={t(tab === 'offers' ? 'farmer.listing.tabOffers' : 'farmer.listing.details')}>
          {tab === 'offers' &&
            (offers.loading && !offers.data ? (
              <Loading />
            ) : offers.error ? (
              <ErrorBox message={offers.error} onRetry={offers.reload} />
            ) : sorted.length ? (
              <>
                <p className="mb-3 text-sm text-muted">{t('farmer.listing.offersCount', { n: sorted.length, pending: pendingCount })}</p>
                <ul className="space-y-3">
                  {paged.pageItems.map((o) => (
                    <OfferItem
                      key={`${o.offerId}-${o.status}`}
                      offer={o}
                      askingPrice={l.pricePerTonne}
                      onDone={(m) => (setChosenTab('offers'), setFlash(m.text ? m : null), reload())}
                    />
                  ))}
                </ul>
                <Pager page={paged.page} pages={paged.pages} setPage={paged.setPage} />
              </>
            ) : (
              <Empty title={t('farmer.listing.offersEmpty')}>
                <p>{t('farmer.listing.offersEmptyHint')}</p>
              </Empty>
            ))}
          {tab === 'details' &&
            (editing ? (
              <EditListing listing={l} onCancel={() => setEditing(false)} onSaved={() => (setEditing(false), setFlash({ text: t('farmer.listing.saved') }), reload())} />
            ) : (
              <Card>
                <dl className="-my-2 divide-y divide-line">
                  <Row label={t('farmer.listing.left')}>{tonnes(l.tonnesLeft)}</Row>
                  <Row label={t('farmer.listing.total')}>{tonnes(l.tonnes)}</Row>
                  <Row label={t('farmer.listing.price')}>{perTonne(l.pricePerTonne)}</Row>
                  <Row label={t('farmer.listing.harvest')}>{monthLabel(l.harvestDate)}</Row>
                  {l.moisturePct != null && <Row label={t('farmer.listing.moisture')}>{l.moisturePct}%</Row>}
                </dl>
                {l.notes && (
                  <div className="mt-3">
                    <p className="text-sm text-muted">{t('farmer.listing.notes')}</p>
                    <p className="whitespace-pre-line">{l.notes}</p>
                  </div>
                )}
                {l.photos.length > 0 && photoUrl(l.photos[0]) && (
                  <ul className="mt-4 grid grid-cols-2 gap-2">
                    {l.photos.map((k) => (
                      <li key={k}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static export, CDN image */}
                        <img src={photoUrl(k)} alt="" className="aspect-square w-full rounded-xl border border-line object-cover" loading="lazy" />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 space-y-2">
                  {canEdit && (
                    <Button variant="secondary" full onClick={() => setEditing(true)}>
                      <Tx k="farmer.listing.edit" />
                    </Button>
                  )}
                  {canReopen && (
                    <Button full loading={busy} onClick={() => setStatus(false)}>
                      <Tx k="farmer.listing.reopen" />
                    </Button>
                  )}
                  {canClose && (
                    <Button variant="danger" full loading={busy} onClick={() => setStatus(true)}>
                      <Tx k="farmer.listing.close" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole roles={['farmer']}>
      <Suspense fallback={<Loading />}>
        <ListingView />
      </Suspense>
    </RequireRole>
  );
}
