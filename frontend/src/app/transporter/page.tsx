'use client';
import type { Order } from '@parali/shared';
import Link from 'next/link';
import { useState } from 'react';
import { RequireRole } from '../../components/layout/RequireRole';
import { Button, Card, Empty, ErrorBox, Loading, PageHeader, Pager, StatusBadge, Tabs, usePaged } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { km, rupees, tonnes } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

type Job = Order & { kmFromYou?: number | null };

function JobCard({ job, onDone }: { job: Job; onDone: (msg?: string) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone(msg);
    } catch (e) {
      setError((e as Error).message);
      if ((e as { status?: number }).status === 409) onDone(); // someone else took it: refresh the board
    } finally {
      setBusy(false);
    }
  };
  const next = job.status === 'ASSIGNED' ? 'pickup' : job.status === 'PICKED_UP' ? 'deliver' : null;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <p className="font-display text-xl">
            {t(`common.crops.${job.crop}`)} · {tonnes(job.tonnes)}
          </p>
          <p className="mt-1 font-semibold">{t('transporter.route', { from: job.pickup.district, to: job.dropoff.district })}</p>
          <p className="text-sm text-muted">
            {km(job.distanceKm)}
            {job.kmFromYou != null && ` · ${t('transporter.fromYou', { km: km(job.kmFromYou) })}`}
          </p>
        </div>
        <StatusBadge kind="order" status={job.status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
        <div>
          <p className="text-sm text-muted">{t('transporter.earn')}</p>
          <p className="text-2xl font-semibold text-field-strong">{rupees(job.transportPerTonne * job.tonnes)}</p>
        </div>
        {job.status === 'AWAITING_TRANSPORT' ? (
          <Button loading={busy} onClick={() => act(() => api(`/jobs/${job.orderId}/claim`, { method: 'POST' }), t('transporter.claimed'))}>
            <Tx k="transporter.claim" />
          </Button>
        ) : next ? (
          <Button loading={busy} onClick={() => act(() => api(`/jobs/${job.orderId}/status`, { method: 'PATCH', body: { action: next } }))}>
            <Tx k={`transporter.${next}`} />
          </Button>
        ) : null}
      </div>
      {job.status !== 'AWAITING_TRANSPORT' && (
        <Link href={`/order/?id=${job.orderId}`} className="mt-3 inline-block font-semibold text-field underline underline-offset-4">
          {t('transporter.open')}
        </Link>
      )}
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}
    </Card>
  );
}

function JobList({ items, empty, onDone }: { items: Job[]; empty: string; onDone: (m?: string) => void }) {
  const { pageItems, page, pages, setPage } = usePaged(items, 5);
  if (!items.length) return <Empty title={empty} />;
  return (
    <>
      <div className="space-y-3">{pageItems.map((j) => <JobCard key={j.orderId} job={j} onDone={onDone} />)}</div>
      <Pager page={page} pages={pages} setPage={setPage} />
    </>
  );
}

function Board() {
  const { t } = useI18n();
  const open = useApi<{ items: Job[] }>('/jobs');
  const mine = useApi<{ items: Job[] }>('/me/orders?as=transporter');
  const [tab, setTab] = useState<'open' | 'mine'>('open');
  const [flash, setFlash] = useState<string | null>(null);
  const done = (msg?: string) => {
    setFlash(msg ?? null);
    open.reload();
    mine.reload();
    if (msg) setTab('mine');
  };
  const active = (mine.data?.items ?? []).filter((j) => j.status === 'ASSIGNED' || j.status === 'PICKED_UP').length;
  const list = tab === 'open' ? open : mine;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="transporter.title" />} sub={t('transporter.sub')} />
      {flash && <p className="mb-4 rounded-xl bg-field-soft px-4 py-3 text-field-strong" role="status">{flash}</p>}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'open', label: <Tx k="transporter.tabOpen" />, count: open.data?.items.length },
          { key: 'mine', label: <Tx k="transporter.tabMine" />, count: active },
        ]}
      />
      {list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : (
        <JobList key={tab} items={list.data.items} empty={t(tab === 'open' ? 'transporter.noOpen' : 'transporter.noMine')} onDone={done} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole roles={['transporter']}>
      <Board />
    </RequireRole>
  );
}
