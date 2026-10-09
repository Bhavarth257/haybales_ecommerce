'use client';
import type { Role } from '@parali/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, ErrorBox, Field, goToStep, Input, PageHeader, StepButtons, StepProgress } from '../../components/ui';
import { HOME, useAuth } from '../../lib/auth';
import { DEMO_AUTH } from '../../lib/config';
import { Tx, useI18n } from '../../lib/i18n';

type SelfRole = Exclude<Role, 'admin'>;
const ROLES: SelfRole[] = ['farmer', 'buyer', 'transporter'];

function Signup() {
  const { me, signUp, confirmSignUp } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const initial = useSearchParams().get('role') as SelfRole | null;
  const [role, setRole] = useState<SelfRole>(initial && ROLES.includes(initial) ? initial : 'farmer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [formStep, setFormStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) router.replace(HOME[me.role]);
  }, [me, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message || t('common.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  // Step 1 picks the role, step 2 collects details and creates the account.
  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formStep === 0) return goToStep(setFormStep, 1);
    run(async () => (await signUp({ role, ...form, phone: form.phone || undefined }), setStep('confirm')));
  };

  if (DEMO_AUTH)
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={<Tx k="auth.signupTitle" />} />
        <Card>
          <p className="text-muted">{t('auth.demoHint')}</p>
          <Link href="/login/" className="mt-2 inline-flex min-h-12 items-center font-semibold text-field underline">{t('common.nav.login')}</Link>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={<Tx k={step === 'form' ? 'auth.signupTitle' : 'auth.confirmTitle'} />} />
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {step === 'form' ? (
        <form className="space-y-5" onSubmit={onFormSubmit}>
          <StepProgress step={formStep} total={2} />
          {formStep === 0 ? (
            <fieldset>
              <legend className="mb-3 font-display text-2xl"><Tx k="auth.chooseRole" /></legend>
              <div className="grid gap-2">
                {ROLES.map((r) => (
                  <label key={r} className="press flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 has-[:checked]:border-field has-[:checked]:bg-field-soft">
                    <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="size-5 accent-[#2f5d34]" />
                    <span>
                      <span className="block font-semibold">{t(`common.roles.${r}`)}</span>
                      <span className="block text-sm text-muted">{t(`auth.roleHint.${r}`)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <>
              <p className="text-sm text-muted">{t('auth.signingUpAs', { role: t(`common.roles.${role}`) })}</p>
              <Field label={t('auth.name')}>{(p) => <Input {...p} autoComplete="name" required value={form.name} onChange={set('name')} />}</Field>
              <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" required value={form.email} onChange={set('email')} />}</Field>
              <Field label={t('auth.phone')} hint="98765 43210">{(p) => <Input {...p} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />}</Field>
              <Field label={t('auth.password')} hint={t('auth.passwordHint')}>{(p) => <Input {...p} type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={set('password')} />}</Field>
            </>
          )}
          <StepButtons step={formStep} total={2} onBack={() => goToStep(setFormStep, 0)} busy={busy} finalKey="auth.submitSignup" />
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), run(() => confirmSignUp(form.email, code, form.password)))}>
          <p className="text-muted">{t('auth.confirmHint', { email: form.email })}</p>
          <Field label={t('auth.code')}>{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
          <Button type="submit" full loading={busy}><Tx k="auth.submitConfirm" /></Button>
        </form>
      )}
      <p className="mt-6 text-center text-muted">
        {t('auth.haveAccount')} <Link href="/login/" className="inline-flex min-h-12 items-center font-semibold text-field underline underline-offset-4">{t('common.nav.login')}</Link>
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  );
}
