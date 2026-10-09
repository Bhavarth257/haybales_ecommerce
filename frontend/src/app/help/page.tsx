'use client';
import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Input, PageHeader, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';

const TEAM_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function Page() {
  const { t } = useI18n();
  const { me } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setError(null);
    try {
      await api('/support', { body: { subject, message } });
      setState('sent');
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={<Tx k="help.title" />} sub={t('help.sub')} />
      {!me ? (
        <Card>
          <p>{t('help.loginFirst')}</p>
          {TEAM_EMAIL && <a href={`mailto:${TEAM_EMAIL}`} className="mt-2 inline-block font-semibold text-field underline underline-offset-4">{TEAM_EMAIL}</a>}
        </Card>
      ) : state === 'sent' ? (
        <p className="rounded-xl bg-field-soft px-4 py-4 text-field-strong" role="status">{t('help.sent')}</p>
      ) : (
        <Card>
          <form onSubmit={send} className="space-y-4">
            <Field label={t('help.subject')}>{(p) => <Input {...p} required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} />}</Field>
            <Field label={t('help.message')} hint={t('help.messageHint')}>
              {(p) => <Textarea {...p} required rows={5} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} />}
            </Field>
            {error && <ErrorBox message={error} />}
            <Button type="submit" full loading={state === 'busy'}><Tx k="help.send" /></Button>
          </form>
        </Card>
      )}
    </div>
  );
}
