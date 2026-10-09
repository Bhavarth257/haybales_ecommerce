'use client';
import type { Role } from '@parali/shared';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { ErrorBox, Loading } from '../ui';

/** Renders children only for signed-in users with one of `roles`; otherwise sends them to login. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !me) router.replace(`/login/?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [loading, me, router]);
  if (!me) return <Loading />; // keep content mounted during refresh()
  if (!roles.includes(me.role)) return <ErrorBox message={t('common.errors.wrongRole', { role: roles.map((r) => t(`common.roles.${r}`)).join(' / ') })} />;
  return (
    <>
      {!me.verified && me.role !== 'admin' && (
        <p className="mb-4 rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-[#6b4a0c]" role="status">
          {t('common.errors.notVerified')}
        </p>
      )}
      {children}
    </>
  );
}
