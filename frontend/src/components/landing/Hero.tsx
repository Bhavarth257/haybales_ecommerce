'use client';
import Link from 'next/link';
import { useI18n, Tx } from '../../lib/i18n';
import { buttonClass } from '../ui';
import { HeroArt } from './HeroArt';

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="grid items-center gap-8 pb-4 pt-2 md:grid-cols-[1.15fr_1fr] md:gap-12 md:pt-6">
      {/* Text sits above the 3D canvas, which may spill behind it on desktop. */}
      <div className="relative z-10">
        <Tx k="landing.hero.title" as="h1" className="font-display text-5xl text-ink sm:text-6xl lg:text-7xl" />
        <p className="mt-5 max-w-[34rem] text-lg text-muted">
          {t('landing.hero.problem')} <span className="text-ink">{t('landing.hero.offer')}</span>
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/signup/?role=farmer" className={"group " + buttonClass('primary')}>
            <Tx k="landing.hero.ctaFarmer" />
            <span aria-hidden className="ml-1 -mr-3 flex size-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 [transition-timing-function:var(--ease-heavy)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 12 4M6 4h6v6" /></svg>
            </span>
          </Link>
          <Link href="/listings/" className={buttonClass('secondary')}>
            <Tx k="landing.hero.ctaBuyer" />
          </Link>
        </div>
        <Link
          href="/signup/?role=transporter"
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-field underline decoration-field/40 underline-offset-4 hover:decoration-field"
        >
          <Tx k="landing.hero.transporter" />
        </Link>
      </div>
      <HeroArt label={t('landing.hero.artLabel')} />
    </section>
  );
}
