'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { scrollBehavior } from '../../lib/motion';
import { useI18n, Tx } from '../../lib/i18n';
import { buttonClass } from '../ui';

const STEPS = ['farmer', 'buyer', 'transporter'] as const;

const FACE: Record<(typeof STEPS)[number], string> = {
  farmer: 'bg-field-soft border-field/20',
  buyer: 'bg-straw-soft border-straw/40',
  transporter: 'bg-surface border-line',
};

/** Steps: one card per screen on phones (swipe or tap Next), a clean 3-column row on desktop. */
export function HowItWorks() {
  const { t } = useI18n();
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: scrollBehavior() });
  };
  return (
    <section className="reveal mt-16 sm:mt-24 lg:mt-40">
      <div>
      <Tx k="landing.eyebrow.how" as="p" className="eyebrow mb-3" />
      <Tx k="landing.how.title" as="h2" className="font-display text-3xl sm:text-4xl" />
      <ol
        ref={track}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="how-cards mt-6 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {STEPS.map((s, i) => (
          <li key={s} className="bezel w-full shrink-0 snap-center md:w-auto" aria-roledescription="slide">
            <div className={`flex h-full min-h-60 flex-col rounded-[22px] p-6 ${FACE[s]}`}>
              <span aria-hidden className="font-display text-5xl leading-none text-ink/20">{String(i + 1).padStart(2, '0')}</span>
              <Tx k={`landing.how.${s}.role`} as="p" className="mt-6 text-sm font-semibold uppercase tracking-wider text-field" />
              <Tx k={`landing.how.${s}.title`} as="h3" className="mt-1.5 font-display text-2xl" />
              <p className="mt-2 text-muted">{t(`landing.how.${s}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      {/* Phone pager: dots + Next (hidden on desktop where all three are visible). */}
      <div className="mt-4 flex items-center justify-between md:hidden">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              aria-current={active === i ? 'step' : undefined}
              aria-label={t(`landing.how.${s}.role`)}
              onClick={() => go(i)}
              className="flex size-11 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all duration-300 ${active === i ? 'w-6 bg-field' : 'w-2 bg-line'}`} />
            </button>
          ))}
        </div>
        <button onClick={() => go((active + 1) % STEPS.length)} className={buttonClass('secondary')}>
          <Tx k={active === STEPS.length - 1 ? 'common.pager.first' : 'common.pager.next'} />
        </button>
      </div>
      </div>
    </section>
  );
}

const FACTORS = ['region', 'distance'] as const;

/** Full-bleed statement whose words fill in as you scroll (reference: threeui Oblo manifesto). */
export function Manifesto() {
  const { t, en, locale } = useI18n();
  const words = t('landing.manifesto.text').split(' ');
  return (
    <section className="mx-[calc(50%-50vw)] mt-16 bg-field-strong px-4 py-20 sm:mt-24 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Tx k="landing.manifesto.kicker" as="p" className="mb-6 text-sm font-semibold uppercase tracking-wider text-straw" />
        <p className="font-display text-3xl leading-[1.12] sm:text-5xl lg:text-6xl">
          {words.map((w, i) => (
            <span key={i} className="fill-word">
              {w}{' '}
            </span>
          ))}
        </p>
        {locale !== 'en' && <p className="mt-4 text-white/85" lang="en">{en('landing.manifesto.text')}</p>}
      </div>
    </section>
  );
}

export function FairPrice() {
  const { t } = useI18n();
  return (
    <section className="reveal bezel mt-16 sm:mt-24 lg:mt-40"><div className="grid gap-8 bg-surface p-5 sm:p-8 md:grid-cols-2 md:gap-12">
      <div>
        <Tx k="landing.eyebrow.price" as="p" className="eyebrow mb-3" />
      <Tx k="landing.price.title" as="h2" className="font-display text-3xl leading-tight sm:text-4xl" />
        <p className="mt-3 max-w-[45ch] text-muted">{t('landing.price.body')}</p>
      </div>
      <dl className="space-y-3">
        {FACTORS.map((f) => (
          <div key={f} className="border-l-4 border-straw pl-4">
            <Tx k={`landing.price.${f}Title`} as="dt" className="font-semibold" />
            <dd className="mt-0.5 text-muted">{t(`landing.price.${f}Body`)}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-field-soft p-4">
          <Tx k="landing.price.deliveredTitle" as="dt" className="font-semibold text-field-strong" />
          <dd className="mt-0.5 text-ink">{t('landing.price.deliveredBody')}</dd>
        </div>
      </dl>
    </div>
    </section>
  );
}

const BUYERS = ['biomass', 'paper', 'feed', 'mushroom', 'packaging'] as const;

export function WhoBuys() {
  const { t } = useI18n();
  return (
    <section className="reveal mt-16 sm:mt-24 lg:mt-40">
      <Tx k="landing.eyebrow.buyers" as="p" className="eyebrow mb-3" />
      <Tx k="landing.buyers.title" as="h2" className="font-display text-3xl leading-tight sm:text-4xl" />
      <p className="mt-2 text-muted">{t('landing.buyers.body')}</p>
      <ul className="mt-5 flex flex-wrap gap-2.5">
        {BUYERS.map((b) => (
          <li key={b} className="rounded-full border border-straw/50 bg-straw-soft px-4 py-2 font-semibold text-ink">
            {t(`landing.buyers.${b}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="reveal mt-16 rounded-card bg-field-strong px-5 py-10 text-white sm:mt-24 sm:px-10 sm:py-14">
      <Tx k="landing.final.title" as="h2" className="max-w-[24ch] font-display text-3xl leading-tight sm:text-4xl" />
      <p className="mt-3 text-white/90">{t('landing.final.body')}</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/signup/?role=farmer"
          className="group inline-flex min-h-12 items-center justify-center press rounded-xl bg-straw px-5 py-2.5 font-semibold text-ink hover:bg-straw-soft active:translate-y-px"
        >
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
        className="mt-4 inline-flex min-h-12 items-center font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
      >
        <Tx k="landing.hero.transporter" />
      </Link>
    </section>
  );
}
