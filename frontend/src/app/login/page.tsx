'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, ErrorBox, Field, Input, PageHeader } from '../../components/ui';
import { authError, HOME, useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';

type Mode = 'login' | 'forgot' | 'reset';

function Login() {
  const { me, signIn, forgotPassword, resetPassword } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  // Only same-site paths, so ?next= can't send people to another website.
  const raw = useSearchParams().get('next');
  const next = raw?.startsWith('/') && !raw.startsWith('//') ? raw : null;
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (me) router.replace(next ?? HOME[me.role]);
  }, [me, next, router]);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setPassword('');
    setCode('');
  };
  const submit = (fn: () => Promise<void>, wrong: string) => async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(authError(err, wrong) || t('common.errors.generic'));
    } finally {
      setBusy(false);
    }
  };
  const emailField = (
    <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" required placeholder={t('common.ph.email')} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
  );

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={<Tx k={mode === 'login' ? 'auth.loginTitle' : 'auth.forgotTitle'} />} />
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {notice && <p className="mb-4 rounded-xl border border-field/30 bg-field-soft px-4 py-3" role="status">{notice}</p>}
      <Card>
        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={submit(() => signIn(email, password), t('auth.wrongLogin'))}>
            {emailField}
            <Field label={t('auth.password')}>{(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
            <Button type="submit" full loading={busy}><Tx k="auth.submitLogin" /></Button>
            <Button type="button" variant="ghost" full onClick={() => go('forgot')}><Tx k="auth.forgot" /></Button>
          </form>
        ) : mode === 'forgot' ? (
          <form className="space-y-4" onSubmit={submit(async () => (await forgotPassword(email), go('reset')), t('common.errors.generic'))}>
            <p className="text-muted">{t('auth.forgotHint')}</p>
            {emailField}
            <Button type="submit" full loading={busy}><Tx k="auth.sendCode" /></Button>
            <Button type="button" variant="ghost" full onClick={() => go('login')}><Tx k="auth.backToLogin" /></Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={submit(async () => (await resetPassword(email, code, password), go('login'), setNotice(t('auth.resetDone'))), t('auth.wrongCode'))}
          >
            <p className="text-muted">{t('auth.confirmHint', { email })}</p>
            <Field label={t('auth.code')}>{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required placeholder={t('common.ph.code')} value={code} onChange={(e) => setCode(e.target.value.trim())} />}</Field>
            <Field label={t('auth.newPassword')}>
              {(p) => <Input {...p} type="password" autoComplete="new-password" minLength={8} required placeholder={t('auth.passwordHint')} value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <Button type="submit" full loading={busy}><Tx k="auth.submitReset" /></Button>
            <Button type="button" variant="ghost" full onClick={() => go('login')}><Tx k="auth.backToLogin" /></Button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-center text-muted">
        {t('auth.noAccount')}{' '}
        <Link href="/signup/" className="inline-flex min-h-12 items-center font-semibold text-field underline underline-offset-4">{t('common.nav.signup')}</Link>
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
