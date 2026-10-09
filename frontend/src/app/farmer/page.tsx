'use client';
import { scrollBehavior } from '../../lib/motion';
import type { Listing, Offer, Order } from '@parali/shared';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ListingRow } from '../../components/farmer/ListingSummary';
import { RequireRole } from '../../components/layout/RequireRole';
import { Button, Empty, ErrorBox, LinkButton, Loading, Pager, StatusBadge, Tabs, usePaged } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../lib/auth';
import { date, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

type Items<T> = { items: T[] };
type TabKey = 'offers' | 'listings' | 'orders';
const PER_PAGE = 5;

function OffersPanel({ offers, byId }: { offers: Offer[]; byId: Map<string, Listing> }) {
  const { t } = useI18n();
  const { pageItems, page, pages, setPage } = usePaged(offers, PER_PAGE);
  if (!offers.length)
    return (
      <Empty title={t('farmer.dash.offersEmpty')}>
        <p>{t('farmer.dash.offersEmptyHint')}</p>
      </Empty>
    );
  return (
    <>
      <ul className="space-y-3">
        {pageItems.map((o) => {
          const l = byId.get(o.listingId);
          const mine = o.turn === 'farmer';
          return (
            <li key={o.offerId} className={`rounded-card border bg-surface p-4 ${mine ? 'border-2 border-straw' : 'border-line'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">
                  {t('farmer.dash.offerLine', { buyer: o.buyerName, tonnes: tonnes(o.tonnes), price: perTonne(o.pricePerTonne) })}
                </p>
                {!mine && <StatusBadge kind="offer" status={o.status} />}
              </div>
              {l && (
                <p className="mt-0.5 text-sm text-muted">
                  {t(`common.crops.${l.crop}`)} · {t(`common.forms.${l.form}`)} · {date(o.createdAt)}
                </p>
              )}
              {o.message && <p className="mt-2 line-clamp-2 italic">“{o.message}”</p>}
              <div className="mt-3">
                <LinkButton href={`/farmer/listing/?id=${o.listingId}`} variant={mine ? 'primary' : 'secondary'} full>
                  <Tx k={mine ? 'farmer.dash.respond' : 'farmer.dash.openListing'} />
                </LinkButton>
              </div>
            </li>
          );
        })}
      </ul>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function ListingsPanel({ listings }: { listings: Listing[] }) {
  const { t } = useI18n();
  const { pageItems, page, pages, setPage } = usePaged(listings, PER_PAGE);
  if (!listings.length)
    return (
      <Empty title={t('farmer.dash.listingsEmpty')}>
        <p>{t('farmer.dash.listingsEmptyHint')}</p>
        <div className="mt-4">
          <LinkButton href="/farmer/new/">
            <Tx k="farmer.dash.cta" />
          </LinkButton>
        </div>
      </Empty>
    );
  return (
    <>
      <ul className="space-y-3">
        {pageItems.map((l) => (
          <li key={l.listingId}>
            <ListingRow l={l} />
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const { pageItems, page, pages, setPage } = usePaged(orders, PER_PAGE);
  if (!orders.length)
    return (
      <Empty title={t('farmer.dash.ordersEmpty')}>
        <p>{t('farmer.dash.ordersEmptyHint')}</p>
      </Empty>
    );
  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {pageItems.map((o) => (
          <li key={o.orderId}>
            <Link href={`/order/?id=${o.orderId}`} className="flex min-h-12 flex-col gap-1 p-4 transition-colors active:bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {t(`common.crops.${o.crop}`)} · {date(o.createdAt)}
                </span>
                <StatusBadge kind="order" status={o.status} />
              </div>
              <span className="text-muted">{t('farmer.dash.orderLine', { buyer: o.buyerName, tonnes: tonnes(o.tonnes), price: perTonne(o.pricePerTonne) })}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function Board({ listings, offers, orders }: { listings: Listing[]; offers: Offer[]; orders: Order[] }) {
  const { t } = useI18n();
  const { me } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  const waiting = offers.filter((o) => o.turn === 'farmer');
  // Offers that need my reply first, newest first within each group.
  const sortedOffers = [...offers].sort((a, b) => Number(b.turn === 'farmer') - Number(a.turn === 'farmer') || b.createdAt.localeCompare(a.createdAt));
  const byId = new Map(listings.map((l) => [l.listingId, l]));
  const [tab, setTab] = useState<TabKey>(waiting.length ? 'offers' : listings.length || !orders.length ? 'listings' : 'orders');

  const listed = listings.filter((l) => l.status !== 'REJECTED').reduce((s, l) => s + l.tonnes, 0);
  const live = orders.filter((o) => o.status !== 'CANCELLED');
  const sold = live.reduce((s, o) => s + o.tonnes, 0);
  const earned = live.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.tonnes * o.pricePerTonne, 0);

  const firstName = me?.name?.split(/[\s(]/)[0];
  const goToOffers = () => {
    setTab('offers');
    panelRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    panelRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">
          {firstName ? <Tx k="farmer.dash.hello" vars={{ name: firstName }} /> : <Tx k="farmer.dash.title" />}
        </h1>
        <p className="mt-1 text-muted">{waiting.length ? t('farmer.dash.offersHint') : t('farmer.dash.sub')}</p>
      </header>

      <div className="mt-5 space-y-2">
        {waiting.length ? (
          <>
            <Button full onClick={goToOffers} className="min-h-14 text-lg">
              <Tx k={waiting.length === 1 ? 'farmer.dash.replyOne' : 'farmer.dash.replyMany'} vars={{ n: waiting.length }} />
            </Button>
            <LinkButton href="/farmer/new/" variant="ghost" full>
              <span aria-hidden className="text-xl leading-none">+</span>
              <Tx k="farmer.dash.cta" />
            </LinkButton>
          </>
        ) : (
          <LinkButton href="/farmer/new/" full>
            <span aria-hidden className="text-2xl leading-none">+</span>
            <Tx k="farmer.dash.cta" />
          </LinkButton>
        )}
      </div>

      <section aria-label={t('farmer.dash.summary')} className="mt-5 rounded-card border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-muted">
          <Tx k="farmer.dash.earned" />
        </p>
        <p className="mt-0.5 font-display text-3xl text-field-strong">{rupees(earned)}</p>
        <p className="text-sm text-muted">{t('farmer.dash.earnedHint')}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-sm text-muted">{t('farmer.dash.listed')}</dt>
            <dd className="text-lg font-semibold">{tonnes(listed)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('farmer.dash.sold')}</dt>
            <dd className="text-lg font-semibold">{tonnes(sold)}</dd>
          </div>
        </dl>
      </section>

      <div ref={panelRef} tabIndex={-1} className="mt-8 scroll-mt-[calc(var(--nav-h)+1rem)] outline-none">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'offers', label: <Tx k="farmer.dash.tabOffers" />, count: waiting.length },
            { key: 'listings', label: <Tx k="farmer.dash.tabListings" />, count: listings.length },
            { key: 'orders', label: <Tx k="farmer.dash.tabOrders" />, count: orders.length },
          ]}
        />
        <div role="tabpanel" aria-label={t(`farmer.dash.tab${tab[0].toUpperCase()}${tab.slice(1)}`)}>
          {tab === 'offers' && <OffersPanel offers={sortedOffers} byId={byId} />}
          {tab === 'listings' && <ListingsPanel listings={listings} />}
          {tab === 'orders' && <OrdersPanel orders={orders} />}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const listings = useApi<Items<Listing>>('/me/listings');
  const offers = useApi<Items<Offer>>('/me/offers?as=farmer');
  const orders = useApi<Items<Order>>('/me/orders?as=farmer');

  if (listings.loading || offers.loading || orders.loading) return <Loading />;
  const error = listings.error ?? offers.error ?? orders.error;
  if (error) return <ErrorBox message={error} onRetry={() => (listings.reload(), offers.reload(), orders.reload())} />;

  return <Board listings={listings.data?.items ?? []} offers={offers.data?.items ?? []} orders={orders.data?.items ?? []} />;
}

export default function Page() {
  return (
    <RequireRole roles={['farmer']}>
      <Dashboard />
    </RequireRole>
  );
}
