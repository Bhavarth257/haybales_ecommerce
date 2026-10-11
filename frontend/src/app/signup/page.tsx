'use client';
import { ageOn, todayIST, type Role } from '@parali/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorBox, Field, goToStep, Input, PageHeader, StepButtons, StepProgress } from '../../components/ui';
import { authError, HOME, useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';

type SelfRole = Exclude<Role, 'admin'>;
const ROLES: SelfRole[] = ['farmer', 'buyer', 'transporter'];
const link = 'font-semibold text-field underline underline-offset-4';
const check = 'flex min-h-11 cursor-pointer items-center gap-2.5 py-1 text-sm text-muted';


function Signup() {
  const { me, signUp, confirmSignUp, resendCode, signIn } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const initial = useSearchParams().get('role') as SelfRole | null;
  const [role, setRole] = useState<SelfRole>(initial && ROLES.includes(initial) ? initial : 'farmer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', dob: '' });
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [formStep, setFormStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

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
      setError(authError(e, t('auth.wrongCode')) || t('common.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  // Age is worked out as soon as a date is picked, so an under-18 sees the guardian route before submitting.
  const age = /^\d{4}-\d{2}-\d{2}$/.test(form.dob) ? ageOn(form.dob, todayIST()) : null;
  const minor = age != null && age < 18;

  // Step 1 picks the role, step 2 collects details and creates the account.
  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formStep === 0) return goToStep(setFormStep, 1);
    if (minor) return;
    run(async () => {
      // Local dev mode auto-confirms, so the account can log in straight away.
      if ((await signUp({ role, ...form, phone: form.phone || undefined, adult, consent })) === 'login') await signIn(form.email, form.password);
      else setStep('confirm');
    });
  };

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
              <Field label={t('auth.name')}>{(p) => <Input {...p} autoComplete="name" required placeholder={t('common.ph.name')} value={form.name} onChange={set('name')} />}</Field>
              <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" required placeholder={t('common.ph.email')} value={form.email} onChange={set('email')} />}</Field>
              <Field label={t('auth.phone')} hint={t('profile.phoneHint')}>{(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" placeholder={t('common.ph.phone')} value={form.phone} onChange={set('phone')} />}</Field>
              <Field label={t('auth.password')}>{(p) => <Input {...p} type="password" autoComplete="new-password" minLength={8} required placeholder={t('auth.passwordHint')} value={form.password} onChange={set('password')} />}</Field>
              <Field label={t('auth.dob')} hint={t('auth.dobHint')}>
                {(p) => <Input {...p} type="date" autoComplete="bday" required min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={set('dob')} />}
              </Field>
              {age != null && !minor && age < 120 && <p className="-mt-2 text-sm text-muted" aria-live="polite">{t('auth.ageIs', { n: age })}</p>}
              {minor && (
                <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-[#6b4a0c]" role="alert">
                  {t('auth.under18')} <Link href="/help/" className={link}>{t('common.footer.help')}</Link>
                </p>
              )}
              <label className={check}>
                <input type="checkbox" required checked={adult} onChange={(e) => setAdult(e.target.checked)} className="size-4 shrink-0 accent-[#2f5d34]" />
                <span>{t('auth.adult')}</span>
              </label>
              <label className={check}>
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-4 shrink-0 accent-[#2f5d34]" />
                <span>
                  {t('auth.agree').split(/(\{terms\}|\{privacy\})/).map((part) =>
                    part === '{terms}' ? <Link key={part} href="/terms/" className={link}>{t('common.footer.terms')}</Link>
                    : part === '{privacy}' ? <Link key={part} href="/privacy/" className={link}>{t('common.legal.privacyTitle')}</Link>
                    : part,
                  )}
                </span>
              </label>
            </>
          )}
          <StepButtons step={formStep} total={2} onBack={() => goToStep(setFormStep, 0)} busy={busy} finalKey="auth.submitSignup" />
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), run(() => confirmSignUp(form.email, code, form.password)))}>
          <p className="text-muted">{t('auth.confirmHint', { email: form.email })}</p>
          <Field label={t('auth.code')}>{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required placeholder={t('common.ph.code')} value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
          <Button type="submit" full loading={busy}><Tx k="auth.submitConfirm" /></Button>
          <Button type="button" variant="ghost" full disabled={busy} onClick={() => run(async () => (await resendCode(form.email), setResent(true)))}>
            <Tx k="auth.resend" />
          </Button>
          {resent && <p className="text-center text-sm text-muted" role="status">{t('auth.resent')}</p>}
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
