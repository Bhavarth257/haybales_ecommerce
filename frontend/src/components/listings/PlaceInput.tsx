'use client';
import type { Place } from '@parali/shared';
import { useState } from 'react';
import { DISTRICTS, STATES } from '../../lib/districts';
import { useI18n } from '../../lib/i18n';
import { Button, Field, Input, Select } from '../ui';

/**
 * Location picker for farms and delivery points: state + district (+ village),
 * with "use my location" for an exact GPS point. Picking a known district fills its centre point.
 */
export function PlaceInput({ value, onChange }: { value: Partial<Place>; onChange: (p: Partial<Place>) => void }) {
  const { t } = useI18n();
  const [gps, setGps] = useState<'idle' | 'busy' | 'error'>('idle');
  const districts = value.state ? Object.keys(DISTRICTS[value.state] ?? {}) : [];

  const pickDistrict = (district: string) => {
    const c = value.state ? DISTRICTS[value.state]?.[district] : undefined;
    onChange({ ...value, district, ...(c ? { lat: c[0], lng: c[1] } : {}) });
  };
  const locate = () => {
    if (!navigator.geolocation) return setGps('error');
    setGps('busy');
    navigator.geolocation.getCurrentPosition(
      (p) => (onChange({ ...value, lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }), setGps('idle')),
      () => setGps('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('place.state')}>
          {(p) => (
            <Select {...p} required value={value.state ?? ''} onChange={(e) => onChange({ ...value, state: e.target.value, district: '' })}>
              <option value="" disabled>{t('place.choose')}</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('place.district')}>
          {(p) =>
            districts.length ? (
              <Select {...p} required value={value.district ?? ''} onChange={(e) => pickDistrict(e.target.value)}>
                <option value="" disabled>{t('place.choose')}</option>
                {districts.map((d) => <option key={d}>{d}</option>)}
              </Select>
            ) : (
              <Input {...p} required value={value.district ?? ''} onChange={(e) => onChange({ ...value, district: e.target.value })} />
            )
          }
        </Field>
      </div>
      <Field label={t('place.village')}>{(p) => <Input {...p} value={value.village ?? ''} onChange={(e) => onChange({ ...value, village: e.target.value || undefined })} />}</Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" loading={gps === 'busy'} onClick={locate}>
          {t('place.useGps')}
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {gps === 'error' ? t('place.gpsError') : value.lat != null ? t('place.pinned', { lat: value.lat.toFixed(3), lng: value.lng!.toFixed(3) }) : t('place.noPin')}
        </span>
      </div>
    </div>
  );
}

export const isCompletePlace = (p: Partial<Place>): p is Place => !!(p.state && p.district && p.lat != null && p.lng != null);
