'use client';
import type { Place, User } from '@parali/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { isCompletePlace, PlaceInput } from '../../components/listings/PlaceInput';
import { Badge, Button, Card, ErrorBox, Field, Input, LinkButton, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { maskPhone } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';

/** "98765 43210" / "+91-98765-43210" -> "+919876543210"; null when it isn't a phone number. */
function normalisePhone(raw: string): string | null {
  const d = raw.replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
  if (/^0[6-9]\d{9}$/.test(d)) return `+91${d.slice(1)}`;
  return /^\+?\d{10,13}$/.test(d) ? d : null;
}

function ProfileForm({ me }: { me: User }) {
  const { t } = useI18n();
  const { refresh, logout } = useAuth();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');
  // The saved number starts masked; Show reveals it for editing.
  const [showPhone, setShowPhone] = useState(!me.phone);
  const [org, setOrg] = useState(me.org ?? '');
  const [place, setPlace] = useState<Partial<Place>>(me.place ?? {});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasOrg = me.role === 'buyer' || me.role === 'transporter';
  const phoneOk = !phone.trim() || normalisePhone(phone) !== null;
  const placeTouched = !!(place.state || place.district || place.lat != null);
  const placeOk = !placeTouched || isCompletePlace(place);
  const nameOk = !!name.trim();
  const why = me.role === 'buyer' ? 'whyBuyer' : me.role === 'farmer' ? 'whyFarmer' : me.role === 'transporter' ? 'whyTransporter' : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSaved(false);
    if (!nameOk || !phoneOk || !placeOk) return;
    const body: Record<string, unknown> = { name: name.trim() };
    const p = phone.trim() ? normalisePhone(phone) : null;
    if (p) body.phone = p;
    if (hasOrg && org.trim()) body.org = org.trim();
    if (isCompletePlace(place)) body.place = { ...place, village: place.village?.trim() || undefined };
    setBusy(true);
    setError(null);
    try {
      await api<User>('/me', { method: 'PUT', body });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-6">
        <Card>
          <Tx k="profile.details" as="h2" className="mb-4 font-display text-xl" />
          <div className="space-y-4">
            <Field label={t('profile.name')} error={touched && !nameOk ? t('profile.nameError') : undefined}>
              {(p) => <Input {...p} required autoComplete="name" maxLength={80} placeholder={t('common.ph.name')} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label={t('profile.phone')} hint={t('profile.phoneHint')} error={touched && !phoneOk ? t('profile.phoneError') : undefined}>
              {(p) =>
                showPhone ? (
                  <Input {...p} type="tel" inputMode="tel" autoComplete="tel" placeholder={t('common.ph.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input {...p} readOnly value={maskPhone(phone)} />
                    <Button type="button" variant="secondary" onClick={() => setShowPhone(true)}>
                      {t('common.show')}
                    </Button>
                  </div>
                )
              }
            </Field>
            {hasOrg && (
              <Field label={t('profile.org')} hint={t('profile.orgHint')}>
                {(p) => <Input {...p} autoComplete="organization" maxLength={120} placeholder={t('common.ph.org')} value={org} onChange={(e) => setOrg(e.target.value)} />}
              </Field>
            )}
          </div>
        </Card>

        <Card className={me.role === 'buyer' && !me.place ? 'border-straw' : ''}>
          <Tx k={me.role === 'buyer' ? 'profile.locationBuyer' : 'profile.location'} as="h2" className="font-display text-xl" />
          {why && <p className="mb-4 mt-1 text-muted">{t(`profile.${why}`)}</p>}
          <PlaceInput value={place} onChange={setPlace} />
          {touched && !placeOk && (
            <p className="mt-3 text-sm text-ember" role="alert">
              {t('profile.placeError')}
            </p>
          )}
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20">
        <Card>
          <Tx k="profile.account" as="h2" className="mb-3 font-display text-xl" />
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted">{t('profile.email')}</dt>
              <dd className="break-all font-semibold">{me.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('profile.role')}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-semibold">
                {t(`common.roles.${me.role}`)}
                {me.role !== 'admin' && <Badge tone={me.verified ? 'good' : 'warn'}>{t(me.verified ? 'profile.verified' : 'profile.unverified')}</Badge>}
              </dd>
            </div>
          </dl>
          {/* The phone navbar has no room for Log out, so it lives here. */}
          <Button type="button" variant="secondary" full className="mt-4 sm:hidden" onClick={logout}>
            <Tx k="common.nav.logout" />
          </Button>
        </Card>
        {error && <ErrorBox message={error} />}
        {saved && (
          <p className="rounded-xl bg-field-soft px-4 py-3 text-field-strong" role="status">
            {t('profile.saved')}
          </p>
        )}
        <Button type="submit" full loading={busy}>
          <Tx k="profile.save" />
        </Button>
      </div>
    </form>
  );
}

/** DPDP right to erasure. Typing DELETE is the confirmation; the server refuses while an order is in progress. */
function DeleteAccount() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/me/delete', { body: { confirm: typed } });
      await logout();
      router.replace('/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6 max-w-2xl">
      <Tx k="profile.deleteTitle" as="h2" className="font-display text-xl" />
      <p className="mb-4 mt-1 text-muted">{t('profile.deleteHint')}</p>
      {!open ? (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <Tx k="profile.deleteButton" />
        </Button>
      ) : (
        <form onSubmit={remove} className="space-y-4">
          <Field label={t('profile.deleteType')}>
            {(p) => <Input {...p} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />}
          </Field>
          {error && <ErrorBox message={error} />}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" loading={busy} disabled={typed !== 'DELETE'}>
              <Tx k="profile.deleteButton" />
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => {
                setOpen(false);
                setTyped('');
              }}>
              <Tx k="common.actions.cancel" />
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

// Not wrapped in RequireRole: auth.refresh() after saving flips `loading`, and RequireRole would
// unmount the form (losing the "saved" message). `me` stays set during a refresh, so gate on it here.
export default function ProfilePage() {
  const { t } = useI18n();
  const { me, loading } = useAuth();
  if (!me)
    return loading ? (
      <Loading />
    ) : (
      <Card>
        <p className="mb-4">{t('common.errors.needLogin')}</p>
        <LinkButton href={`/login/?next=${encodeURIComponent('/profile/')}`}>
          <Tx k="common.nav.login" />
        </LinkButton>
      </Card>
    );
  return (
    <>
      <PageHeader title={<Tx k="profile.title" />} sub={t('profile.sub')} />
      <ProfileForm me={me} />
      {me.role !== 'admin' && <DeleteAccount />}
    </>
  );
}
