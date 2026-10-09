'use client';
import type { Offer, Order } from '@parali/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequireRole } from '../../components/layout/RequireRole';
import { Button, Card, Empty, ErrorBox, LinkButton, Loading, PageHeader, Pager, StatusBadge, Tabs, usePaged } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { date, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

const linkClass = 'inline-flex min-h-12 items-center font-semibold text-field underline-offset-4 hover:underline';

function OfferRow({ offer: o, onChanged }: { offer: Offer; onChanged: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<'accept' | 'withdraw' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countered = o.status === 'COUNTERED' && o.turn === 'buyer';
  const open = o.status === 'PENDING' || countered;

  const act = async (action: 'accept' | 'withdraw') => {
    if (action === 'withdraw' && !confirm(t('buyer.dashboard.confirmWithdraw'))) return;
    setBusy(action);
    setError(null);
    try {
      const res = await api<{ offer: Offer; order?: Order }>(`/listings/${encodeURIComponent(o.listingId)}/offers/${encodeURIComponent(o.offerId)}`, {
        method: 'PATCH',
        body: { action },
      });
      if (res.order) router.push(`/order/?id=${encodeURIComponent(res.order.orderId)}`);
      else onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <li>
      <Card className={countered ? 'border-sky/40' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-lg font-semibold tabular-nums">{t('buyer.dashboard.offerLine', { tonnes: tonnes(o.tonnes), price: perTonne(o.pricePerTonne) })}</p>
          <StatusBadge kind="offer" status={o.status} />
        </div>
        {countered && o.counterPrice != null && (
          <p className="mt-2 rounded-xl bg-sky-soft px-3.5 py-2.5 text-sky">
            {t('buyer.dashboard.counterLine', { counter: rupees(o.counterPrice), price: perTonne(o.pricePerTonne) })}
          </p>
        )}
        {o.message && <p className="mt-2 text-muted">“{o.message}”</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-muted">
          <span>{t('buyer.dashboard.sentOn', { date: date(o.createdAt) })}</span>
          <Link href={`/listing/?id=${encodeURIComponent(o.listingId)}`} className={linkClass}>
            {t('buyer.dashboard.viewListing')}
          </Link>
        </div>
        {error && (
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        )}
        {open && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex">
            {countered && (
              <Button onClick={() => act('accept')} loading={busy === 'accept'} disabled={!!busy}>
                <Tx k="buyer.dashboard.acceptCounter" vars={{ price: perTonne(o.counterPrice ?? o.pricePerTonne) }} />
              </Button>
            )}
            <Button variant="danger" onClick={() => act('withdraw')} loading={busy === 'withdraw'} disabled={!!busy}>
              <Tx k="buyer.dashboard.withdraw" />
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const { t } = useI18n();
  const total = o.tonnes * (o.pricePerTonne + o.transportPerTonne);
  return (
    <li>
      <Link href={`/order/?id=${encodeURIComponent(o.orderId)}`} className="press block rounded-card border border-line bg-surface p-4 hover:border-ink/30 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-lg font-semibold">
            {t('common.crops.' + o.crop)} · {o.pickup.district}
          </p>
          <StatusBadge kind="order" status={o.status} />
        </div>
        <p className="mt-1 tabular-nums">{t('buyer.dashboard.orderLine', { tonnes: tonnes(o.tonnes), total: rupees(total) })}</p>
        <p className="mt-1 text-sm text-muted">
          {date(o.createdAt)} · <span className="font-semibold text-field">{t('buyer.dashboard.viewOrder')} →</span>
        </p>
      </Link>
    </li>
  );
}

type Tab = 'wait' | 'offers' | 'orders';

function Dashboard() {
  const { t } = useI18n();
  const offers = useApi<{ items: Offer[] }>('/me/offers');
  const orders = useApi<{ items: Order[] }>('/me/orders');
  const reloadAll = () => {
    offers.reload();
    orders.reload();
  };
  const all = offers.data?.items ?? [];
  const waiting = all.filter((o) => o.status === 'COUNTERED' && o.turn === 'buyer');
  const rest = all.filter((o) => !waiting.includes(o));
  // Open offers before closed ones; the API already returns newest first.
  rest.sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING'));
  const orderItems = orders.data?.items ?? [];

  const waitPage = usePaged(waiting, 5);
  const offerPage = usePaged(rest, 5);
  const orderPage = usePaged(orderItems, 5);

  // Open on whatever needs the buyer's action, until they pick a tab themselves.
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (waiting.length ? 'wait' : orderItems.length ? 'orders' : 'offers');

  const offersState = offers.error ? (
    <ErrorBox message={offers.error} onRetry={offers.reload} />
  ) : offers.loading && !offers.data ? (
    <Loading />
  ) : null;

  return (
    <>
      <PageHeader title={<Tx k="buyer.dashboard.title" />} sub={t('buyer.dashboard.sub')} action={<LinkButton href="/listings/"><Tx k="buyer.dashboard.browse" /></LinkButton>} />

      <Tabs<Tab>
        tabs={[
          { key: 'wait', label: <Tx k="buyer.dashboard.tabWait" />, count: waiting.length },
          { key: 'offers', label: <Tx k="buyer.dashboard.offers" />, count: rest.length },
          { key: 'orders', label: <Tx k="buyer.dashboard.orders" />, count: orderItems.length },
        ]}
        value={tab}
        onChange={setPicked}
      />

      {tab === 'wait' && (
        <section role="tabpanel" aria-label={t('buyer.dashboard.needAction')}>
          {offersState ??
            (!waiting.length ? (
              <Empty title={t('buyer.dashboard.noWaiting')}>{t('buyer.dashboard.noWaitingHint')}</Empty>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">{t('buyer.dashboard.needAction')}</p>
                <ul className="grid gap-3 md:grid-cols-2">
                  {waitPage.pageItems.map((o) => (
                    <OfferRow key={o.offerId} offer={o} onChanged={reloadAll} />
                  ))}
                </ul>
                <Pager page={waitPage.page} pages={waitPage.pages} setPage={waitPage.setPage} />
              </>
            ))}
        </section>
      )}

      {tab === 'offers' && (
        <section role="tabpanel" aria-label={t('buyer.dashboard.offers')}>
          {offersState ??
            (!rest.length ? (
              <Empty title={t('buyer.dashboard.noOffers')}>{t('buyer.dashboard.noOffersHint')}</Empty>
            ) : (
              <>
                <ul className="grid gap-3 md:grid-cols-2">
                  {offerPage.pageItems.map((o) => (
                    <OfferRow key={o.offerId} offer={o} onChanged={reloadAll} />
                  ))}
                </ul>
                <Pager page={offerPage.page} pages={offerPage.pages} setPage={offerPage.setPage} />
              </>
            ))}
        </section>
      )}

      {tab === 'orders' && (
        <section role="tabpanel" aria-label={t('buyer.dashboard.orders')}>
          {orders.error ? (
            <ErrorBox message={orders.error} onRetry={orders.reload} />
          ) : orders.loading && !orders.data ? (
            <Loading />
          ) : !orderItems.length ? (
            <Empty title={t('buyer.dashboard.noOrders')}>{t('buyer.dashboard.noOrdersHint')}</Empty>
          ) : (
            <>
              <ul className="grid gap-3 md:grid-cols-2">
                {orderPage.pageItems.map((o) => (
                  <OrderRow key={o.orderId} order={o} />
                ))}
              </ul>
              <Pager page={orderPage.page} pages={orderPage.pages} setPage={orderPage.setPage} />
            </>
          )}
        </section>
      )}
    </>
  );
}

export default function BuyerPage() {
  return (
    <RequireRole roles={['buyer']}>
      <Dashboard />
    </RequireRole>
  );
}
