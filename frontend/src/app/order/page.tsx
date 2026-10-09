'use client';
import type { Order, Place } from '@parali/shared';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { RequireRole } from '../../components/layout/RequireRole';
import { Timeline } from '../../components/order/Timeline';
import { Button, Card, ErrorBox, Loading, StatusBadge, Tabs } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, km, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

const H2 = ({ k }: { k: string }) => <Tx k={k} as="h2" className="mb-3 font-display text-xl" />;

function PlaceBlock({ title, place }: { title: string; place: Place }) {
  const { t } = useI18n();
  return (
    <div>
      <Tx k={title} as="h3" className="text-sm font-semibold text-muted" />
      <p className="mt-0.5 font-semibold">{[place.village, place.district, place.state].filter(Boolean).join(', ')}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center font-semibold text-field underline-offset-4 hover:underline"
      >
        {t('order.openMap')} ↗
      </a>
    </div>
  );
}

function Contact({ role, name, phone }: { role: string; name?: string; phone?: string }) {
  const { t } = useI18n();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <div>
        <p className="text-sm text-muted">{t(`common.roles.${role}`)}</p>
        <p className="font-semibold">{name ?? t('order.noTransporter')}</p>
      </div>
      {phone ? (
        <a href={`tel:${phone}`} className="inline-flex min-h-12 items-center rounded-xl border border-line px-4 font-semibold text-field hover:border-ink/40">
          {t('order.call', { phone })}
        </a>
      ) : name ? (
        <span className="text-sm text-muted">{t('order.noPhone')}</span>
      ) : null}
    </li>
  );
}

function Row({ label, sub, value, strong }: { label: ReactNode; sub?: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${strong ? 'border-t border-ink/20 text-lg font-semibold' : ''}`}>
      <div>
        <p>{label}</p>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      <p className="shrink-0 tabular-nums">{value}</p>
    </div>
  );
}

type OrderTab = 'status' | 'cost' | 'contacts';

function OrderDetail() {
  const { t } = useI18n();
  const { me } = useAuth();
  const id = useSearchParams().get('id');
  const { data: o, error, loading, reload } = useApi<Order>(id ? `/orders/${encodeURIComponent(id)}` : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<OrderTab>('status');

  if (!id) return <ErrorBox message={t('common.errors.generic')} />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !o) return <Loading />;
  if (!o || !me) return null;

  const run = async (key: string, path: string, init: { method?: string; body?: unknown }, confirmKey?: string) => {
    if (confirmKey && !confirm(t(confirmKey))) return;
    setBusy(key);
    setActionError(null);
    try {
      await api<Order>(path, { method: init.method ?? 'POST', body: init.body });
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const stubble = o.tonnes * o.pricePerTonne;
  const transport = o.tonnes * o.transportPerTonne;
  const oid = encodeURIComponent(o.orderId);
  const isBuyer = me.userId === o.buyerId;
  const isFarmer = me.userId === o.farmerId;
  const isTransporter = me.userId === o.transporterId;

  const actions: ReactNode[] = [];
  if (isBuyer && o.status === 'DELIVERED')
    actions.push(
      <Button key="pay" full loading={busy === 'pay'} disabled={!!busy} onClick={() => run('pay', `/orders/${oid}/pay`, {})}>
        <Tx k="order.pay" vars={{ amount: rupees(stubble + transport) }} />
      </Button>,
    );
  if (isTransporter && o.status === 'ASSIGNED')
    actions.push(
      <Button key="pickup" full loading={busy === 'pickup'} disabled={!!busy} onClick={() => run('pickup', `/jobs/${oid}/status`, { method: 'PATCH', body: { action: 'pickup' } })}>
        <Tx k="order.pickedUp" />
      </Button>,
    );
  if (isTransporter && o.status === 'PICKED_UP')
    actions.push(
      <Button key="deliver" full loading={busy === 'deliver'} disabled={!!busy} onClick={() => run('deliver', `/jobs/${oid}/status`, { method: 'PATCH', body: { action: 'deliver' } })}>
        <Tx k="order.delivered" />
      </Button>,
    );
  if ((isBuyer || isFarmer) && o.status === 'AWAITING_TRANSPORT')
    actions.push(
      <Button key="cancel" variant="danger" full loading={busy === 'cancel'} disabled={!!busy} onClick={() => run('cancel', `/orders/${oid}/cancel`, {}, 'order.confirmCancel')}>
        <Tx k="order.cancel" />
      </Button>,
    );

  return (
    <>
      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">
            <Tx k="order.title" vars={{ crop: t('common.crops.' + o.crop), tonnes: tonnes(o.tonnes) }} />
          </h1>
          <StatusBadge kind="order" status={o.status} />
        </div>
        <p className="mt-1 text-muted tabular-nums">
          {t('order.placed', { date: date(o.createdAt) })} · {t('order.totalShort', { amount: rupees(stubble + transport) })}
        </p>
      </header>

      <Tabs<OrderTab>
        tabs={[
          { key: 'status', label: <Tx k="order.progress" /> },
          { key: 'cost', label: <Tx k="order.cost" /> },
          { key: 'contacts', label: <Tx k="order.contacts" /> },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mx-auto max-w-2xl">
        {tab === 'status' && (
          <div role="tabpanel" aria-label={t('order.progress')} className="space-y-4">
            {(actions.length > 0 || actionError) && (
              <Card className="border-field/40">
                <H2 k="order.actions" />
                <div className="space-y-2">{actions}</div>
                {isBuyer && o.status === 'DELIVERED' && <p className="mt-3 text-sm text-muted">{t('order.payNote')}</p>}
                {actionError && (
                  <div className="mt-3">
                    <ErrorBox message={actionError} />
                  </div>
                )}
              </Card>
            )}
            <Card>
              {o.status === 'CANCELLED' ? <p className="text-muted">{t('order.cancelledNote')}</p> : <Timeline status={o.status} />}
              {o.status === 'PAID' && <p className="mt-4 rounded-xl bg-field-soft px-3.5 py-2.5 text-field-strong">{t('order.paidNote')}</p>}
            </Card>
          </div>
        )}

        {tab === 'cost' && (
          <Card>
            <div role="tabpanel" aria-label={t('order.cost')}>
              <Row label={t('order.stubble')} sub={t('order.calc', { tonnes: tonnes(o.tonnes), price: perTonne(o.pricePerTonne) })} value={rupees(stubble)} />
              <Row
                label={t('order.transport')}
                sub={`${t('order.calc', { tonnes: tonnes(o.tonnes), price: perTonne(o.transportPerTonne) })} · ${t('order.distance', { km: km(o.distanceKm) })}`}
                value={rupees(transport)}
              />
              <Row label={t('order.total')} value={rupees(stubble + transport)} strong />
              <p className="mt-2 text-sm text-muted">{t('order.farmerGets', { amount: rupees(stubble) })}</p>
            </div>
          </Card>
        )}

        {tab === 'contacts' && (
          <div role="tabpanel" aria-label={t('order.contacts')} className="space-y-4">
            <Card>
              <ul className="divide-y divide-line">
                <Contact role="farmer" name={o.farmerName} phone={o.farmerPhone} />
                <Contact role="buyer" name={o.buyerName} phone={o.buyerPhone} />
                <Contact role="transporter" name={o.transporterName} phone={o.transporterPhone} />
              </ul>
            </Card>
            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <PlaceBlock title="order.pickup" place={o.pickup} />
                <PlaceBlock title="order.dropoff" place={o.dropoff} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export default function OrderPage() {
  return (
    <RequireRole roles={['farmer', 'buyer', 'transporter', 'admin']}>
      <Suspense fallback={<Loading />}>
        <OrderDetail />
      </Suspense>
    </RequireRole>
  );
}
