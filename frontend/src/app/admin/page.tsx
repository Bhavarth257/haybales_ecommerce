'use client';
import type { Listing, Order, Role, User } from '@parali/shared';
import Link from 'next/link';
import { useState } from 'react';
import { ImpactCounter } from '../../components/landing/ImpactCounter';
import { RequireRole } from '../../components/layout/RequireRole';
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, Pager, StatusBadge, Tabs, usePaged } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { date, perTonne, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

type Tab = 'listings' | 'users' | 'orders' | 'impact';

/** Runs an admin action, then reloads; shows its own error. */
function useAction(reload: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return { busy, error, run };
}

function Paged<T>({ items, empty, render }: { items: T[]; empty: string; render: (x: T) => React.ReactNode }) {
  const { pageItems, page, pages, setPage } = usePaged(items, 6);
  if (!items.length) return <Empty title={empty} />;
  return (
    <>
      <div className="space-y-3">{pageItems.map(render)}</div>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function PendingListings() {
  const { t } = useI18n();
  const q = useApi<{ items: Listing[] }>('/admin/listings?status=PENDING_APPROVAL');
  const { busy, error, run } = useAction(q.reload);
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading />;
  const review = (id: string, decision: 'approve' | 'reject') =>
    run(id + decision, () => api(`/admin/listings/${id}`, { method: 'PATCH', body: { decision } }));
  return (
    <>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <Paged
        items={q.data.items}
        empty={t('admin.noPending')}
        render={(l) => (
          <Card key={l.listingId}>
            <p className="font-display text-xl">{t(`common.crops.${l.crop}`)} · {tonnes(l.tonnes)} · {perTonne(l.pricePerTonne)}</p>
            <p className="text-muted">
              {[l.place.village, l.place.district, l.place.state].filter(Boolean).join(', ')} · {t('admin.by', { name: l.farmerName })}
            </p>
            {l.notes && <p className="mt-2">{l.notes}</p>}
            <div className="mt-4 flex gap-3">
              <Button loading={busy === l.listingId + 'approve'} onClick={() => review(l.listingId, 'approve')}><Tx k="admin.approve" /></Button>
              <Button variant="danger" loading={busy === l.listingId + 'reject'} onClick={() => confirm(t('admin.confirmReject')) && review(l.listingId, 'reject')}><Tx k="admin.reject" /></Button>
            </div>
          </Card>
        )}
      />
    </>
  );
}

const ROLES: Role[] = ['farmer', 'buyer', 'transporter'];

function People() {
  const { t } = useI18n();
  const [role, setRole] = useState<Role>('farmer');
  const [all, setAll] = useState(false);
  const q = useApi<{ items: User[] }>(`/admin/users?role=${role}${all ? '' : '&verified=false'}`);
  const { busy, error, run } = useAction(q.reload);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className="press min-h-11 rounded-full border border-line px-4 font-semibold aria-pressed:border-field aria-pressed:bg-field-soft">
            {t(`common.roles.${r}`)}
          </button>
        ))}
        <label className="ml-auto flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="size-5 accent-[#2f5d34]" />
          {t('admin.showVerified')}
        </label>
      </div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : !q.data ? (
        <Loading />
      ) : (
        <Paged
          key={role + all}
          items={q.data.items}
          empty={t('admin.noUsers')}
          render={(u) => (
            <Card key={u.userId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.org ?? u.name}</p>
                  <p className="text-sm text-muted">{[u.email, u.phone, u.place && `${u.place.district}, ${u.place.state}`].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge tone={u.verified ? 'good' : 'warn'}>{t(u.verified ? 'admin.verified' : 'admin.unverified')}</Badge>
              </div>
              <Button
                className="mt-3"
                variant={u.verified ? 'secondary' : 'primary'}
                loading={busy === u.userId}
                onClick={() => (!u.verified || confirm(t('admin.confirmUnverify'))) && run(u.userId, () => api(`/admin/users/${u.userId}`, { method: 'PATCH', body: { verified: !u.verified } }))}
              >
                <Tx k={u.verified ? 'admin.unverify' : 'admin.verify'} />
              </Button>
            </Card>
          )}
        />
      )}
    </>
  );
}

function Orders() {
  const { t } = useI18n();
  const q = useApi<{ items: Order[] }>('/admin/orders');
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading />;
  return (
    <Paged
      items={q.data.items}
      empty={t('admin.noOrders')}
      render={(o) => (
        <Link key={o.orderId} href={`/order/?id=${o.orderId}`} className="press block rounded-card border border-line bg-surface p-4 hover:border-ink/30">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">
              {t(`common.crops.${o.crop}`)} · {tonnes(o.tonnes)} · {o.pickup.district} → {o.dropoff.district}
            </p>
            <StatusBadge kind="order" status={o.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {o.farmerName} → {o.buyerName} · {rupees(o.tonnes * o.pricePerTonne)} · {date(o.createdAt)}
          </p>
        </Link>
      )}
    />
  );
}

function Console() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('listings');
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={<Tx k="admin.title" />} sub={t('admin.sub')} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'listings', label: <Tx k="admin.tabListings" /> },
          { key: 'users', label: <Tx k="admin.tabUsers" /> },
          { key: 'orders', label: <Tx k="admin.tabOrders" /> },
          { key: 'impact', label: <Tx k="admin.tabImpact" /> },
        ]}
      />
      {tab === 'listings' && <PendingListings />}
      {tab === 'users' && <People />}
      {tab === 'orders' && <Orders />}
      {tab === 'impact' && <ImpactCounter />}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole roles={['admin']}>
      <Console />
    </RequireRole>
  );
}
