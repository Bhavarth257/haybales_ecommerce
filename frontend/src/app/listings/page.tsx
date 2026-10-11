'use client';
import { CROPS, type GeoPoint, type Listing } from '@parali/shared';
import { useState, type ChangeEvent } from 'react';
import { ListingCard } from '../../components/listings/ListingCard';
import { Button, Empty, ErrorBox, Field, Loading, PageHeader, Pager, Select, usePaged } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../lib/auth';
import { STATES } from '../../lib/districts';
import { rupees } from '../../lib/format';
import { Tx, useI18n } from '../../lib/i18n';

const PRICES = [1500, 2000, 2500, 3000];
const RADII = [25, 50, 100];

export default function BrowsePage() {
  const { t } = useI18n();
  const { me } = useAuth();
  const [state, setState] = useState('');
  const [crop, setCrop] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [radius, setRadius] = useState('');
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'busy' | 'error'>('idle');

  // The saved profile place wins: offers are quoted from it, so cards must show that same delivered price.
  const here: GeoPoint | null = me?.place ? { lat: me.place.lat, lng: me.place.lng } : gps;

  const qs = new URLSearchParams();
  if (state) qs.set('state', state);
  if (crop) qs.set('crop', crop);
  if (maxPrice) qs.set('maxPrice', maxPrice);
  if (here) {
    qs.set('lat', String(here.lat));
    qs.set('lng', String(here.lng));
    if (radius) qs.set('radiusKm', radius);
  }
  const query = qs.toString();
  const { data, error, loading, reload } = useApi<{ items: Listing[] }>(`/listings${query ? `?${query}` : ''}`);

  const locate = () => {
    if (!navigator.geolocation) return setGpsStatus('error');
    setGpsStatus('busy');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4) });
        setGpsStatus('idle');
      },
      () => setGpsStatus('error'),
      { timeout: 10000 },
    );
  };
  const filtered = !!(state || crop || maxPrice || radius);
  const activeCount = [state, crop, maxPrice, radius].filter(Boolean).length;
  const items = data?.items ?? [];
  const { pageItems, page, pages, setPage } = usePaged(items, 6);
  const [open, setOpen] = useState(false);
  // Any filter change starts the results from page 1.
  const pick = (set: (v: string) => void) => (e: ChangeEvent<HTMLSelectElement>) => {
    set(e.target.value);
    setPage(0);
  };
  const clear = () => {
    setState('');
    setCrop('');
    setMaxPrice('');
    setRadius('');
    setPage(0);
  };
  const where =
    gpsStatus === 'error'
      ? t('buyer.browse.locationError')
      : me?.place
        ? t('buyer.browse.fromPlace', { place: `${me.place.district}, ${me.place.state}` })
        : gps
          ? t('buyer.browse.fromGps')
          : t('buyer.browse.noLocation');

  return (
    <>
      <PageHeader title={<Tx k="buyer.browse.title" />} sub={t('buyer.browse.sub')} />

      <section aria-labelledby="filters-h" className="mb-5">
        <h2 id="filters-h" className="sr-only">
          {t('buyer.browse.filters')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="filters-panel"
            onClick={() => setOpen((o) => !o)}
            className={`press inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-base font-semibold ${open || filtered ? 'border-field bg-field-soft text-field' : 'border-line bg-surface text-ink'}`}
          >
            <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h14M6 10h8M9 15h2" />
            </svg>
            <Tx k="buyer.browse.filters" />
            {activeCount > 0 && <span className="rounded-full bg-field px-1.5 text-xs text-white">{activeCount}</span>}
          </button>
          {!gps && !me?.place && (
            <Button type="button" variant="secondary" loading={gpsStatus === 'busy'} onClick={locate}>
              <Tx k="buyer.browse.useLocation" />
            </Button>
          )}
          {filtered && (
            <Button type="button" variant="ghost" onClick={clear}>
              <Tx k="buyer.browse.clear" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          {where}
        </p>

        <div id="filters-panel" hidden={!open} className="mt-3 rounded-card border border-line bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Field label={t('buyer.browse.state')}>
              {(p) => (
                <Select {...p} value={state} onChange={pick(setState)}>
                  <option value="">{t('buyer.browse.anyState')}</option>
                  {STATES.filter((s) => s !== 'Other').map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('buyer.browse.crop')}>
              {(p) => (
                <Select {...p} value={crop} onChange={pick(setCrop)}>
                  <option value="">{t('buyer.browse.anyCrop')}</option>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>
                      {t('common.crops.' + c)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('buyer.browse.maxPrice')}>
              {(p) => (
                <Select {...p} value={maxPrice} onChange={pick(setMaxPrice)}>
                  <option value="">{t('buyer.browse.anyPrice')}</option>
                  {PRICES.map((n) => (
                    <option key={n} value={n}>
                      {t('buyer.browse.upTo', { price: rupees(n) })}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('buyer.browse.distance')} hint={here ? undefined : t('buyer.browse.distanceNeedsPlace')}>
              {(p) => (
                <Select {...p} value={here ? radius : ''} disabled={!here} onChange={pick(setRadius)}>
                  <option value="">{t('buyer.browse.anyDistance')}</option>
                  {RADII.map((n) => (
                    <option key={n} value={n}>
                      {t('buyer.browse.within', { km: n })}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Button type="button" variant="secondary" full className="mt-4 sm:hidden" onClick={() => setOpen(false)}>
            <Tx k="buyer.browse.showResults" />
          </Button>
        </div>
      </section>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : !items.length ? (
        <Empty title={t('buyer.browse.emptyTitle')}>{t('buyer.browse.emptyHint')}</Empty>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold text-muted" aria-live="polite">
            {t('buyer.browse.results', { n: items.length })}
          </p>
          <ul className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading || undefined}>
            {pageItems.map((l) => (
              <li key={l.listingId}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
          <Pager page={page} pages={pages} setPage={setPage} />
        </>
      )}
    </>
  );
}
