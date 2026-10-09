'use client';
import type { ListingStatus, OfferStatus, OrderStatus } from '@parali/shared';
import type { ReactNode } from 'react';
import { useI18n } from '../../lib/i18n';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-paper text-muted border-line',
  good: 'bg-field-soft text-field-strong border-field/25',
  warn: 'bg-straw-soft text-[#6b4a0c] border-straw/40',
  bad: 'bg-ember-soft text-ember border-ember/30',
  info: 'bg-sky-soft text-sky border-sky/25',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold ${TONE[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  PENDING_APPROVAL: 'warn', ACTIVE: 'good', SOLD_OUT: 'neutral', CLOSED: 'neutral', REJECTED: 'bad',
  PENDING: 'warn', COUNTERED: 'info', ACCEPTED: 'good', WITHDRAWN: 'neutral',
  AWAITING_TRANSPORT: 'warn', ASSIGNED: 'info', PICKED_UP: 'info', DELIVERED: 'good', PAID: 'good', CANCELLED: 'neutral',
};

/** Status pill for listings, offers and orders; text is translated (common.*Status). */
export function StatusBadge({ kind, status }: { kind: 'listing' | 'offer' | 'order'; status: ListingStatus | OfferStatus | OrderStatus }) {
  const { t } = useI18n();
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{t(`common.${kind}Status.${status}`)}</Badge>;
}
