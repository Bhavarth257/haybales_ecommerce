'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, PageHeader } from '../../components/ui';
import { DEMO_USERS, HOME, useAuth } from '../../lib/auth';
import { DEMO_AUTH } from '../../lib/config';
import { Tx, useI18n } from '../../lib/i18n';

function Login() {
  const { me, signIn, loginDemo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  // Only same-site paths, so ?next= can't send people to another website.
  const raw = useSearchParams().get('next');
  const next = raw?.startsWith('/') && !raw.startsWith('//') ? raw : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) router.replace(next ?? HOME[me.role]);
  }, [me, next, router]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message || t('common.errors.generic'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={<Tx k="auth.loginTitle" />} />
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {DEMO_AUTH ? (
        <Card>
          <h2 className="font-semibold"><Tx k="auth.demoTitle" /></h2>
          <p className="mb-4 text-sm text-muted">{t('auth.demoHint')}</p>
          <ul className="space-y-2">
            {DEMO_USERS.map((u) => (
              <li key={u.id}>
                <Button variant="secondary" full loading={busy === u.id} onClick={() => run(u.id, () => loginDemo(u.id))} className="justify-between">
                  <span>{u.name}</span>
                  <span className="text-sm font-normal text-muted">{t(`common.roles.${u.role}`)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), run('login', () => signIn(email, password)))}>
            <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Field label={t('auth.password')}>{(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
            <Button type="submit" full loading={busy === 'login'}><Tx k="auth.submitLogin" /></Button>
          </form>
        </Card>
      )}
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
