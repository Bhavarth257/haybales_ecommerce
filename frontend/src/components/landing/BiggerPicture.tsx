'use client';
import { count, rupees } from '../../lib/format';
import { useI18n, Tx } from '../../lib/i18n';

// Static yearly figures for Punjab + Haryana. Numbers and method: see the sources below.
const P = 'landing.bigger.';
const CARDS = [
  { id: 'burned', n: count(70) },
  { id: 'pools', n: count(20000) },
  { id: 'co2', n: count(1) },
  { id: 'pm25', n: count(57000) },
  { id: 'delhi', n: count(37) },
  { id: 'worth', n: rupees(1050) },
];
const VARS = { price: rupees(1500), acre: rupees(3750) };
const FIXES = ['seeder', 'rot', 'sell', 'feed', 'govt', 'setu'];
const SOURCES: [string, string][] = [
  ['Punjab Govt action plan, via Business Standard (2024)', 'https://www.business-standard.com/india-news/ngt-asks-punjab-to-explain-how-it-will-handle-19-mn-tonne-of-paddy-stubble-124041100359_1.html'],
  ['CAQM review, via Krishi Jagran (2024)', 'https://krishijagran.com/news/delhi-ncr-gears-up-for-winter-pollution-as-high-level-task-force-reviews-air-quality-measures/?amp=1'],
  ['iFOREST Stubble Burning Status Report 2025, via The Week', 'https://www.theweek.in/wire-updates/national/2025/12/08/del43-env-stubble-burning-report.html'],
  ['Punjab wheat-season fires, The Tribune', 'https://www.tribuneindia.com/news/punjab/6244-farm-fires-in-punjab-so-far'],
  ['CPCB NCR air quality bulletin, 16 Nov 2024', 'https://cpcb.gov.in/uploads/AQM/AQ-NCR-16112024.pdf'],
  ['Andreae 2019, Atmospheric Chemistry and Physics 19:8523', 'https://acp.copernicus.org/articles/19/8523/2019/'],
  ['Rice-straw baler field tests, Misr J. Agric. Eng.', 'https://mjae.journals.ekb.eg/article_98389.html'],
  ['Biomass plant straw price, The Tribune', 'https://tribuneindia.com/news/no-hike-in-paddy-stubble-price-by-biomass-plants'],
  ['Punjab straw managed in 2025, The Tribune', 'https://www.tribuneindia.com/news/punjab/farm-fires-down-to-50-as-season-nears-end'],
  ['Haryana incentive and CRM subsidy, The Tribune', 'https://www.tribuneindia.com/news/haryana/explainer-haryana-targets-further-drop-in-stubble-burning-after-39-per-cent-decline'],
  ['NAAS Policy Brief No. 2, Crop Burning', 'https://naas.org.in/Policy%20Briefs/Policy%20Brief%202%20-%20Crop%20Burning.pdf'],
];

export function BiggerPicture() {
  const { t } = useI18n();
  return (
    <section aria-label={t(P + 'title')} className="reveal mt-16 sm:mt-24 lg:mt-40">
      <Tx k={P + 'eyebrow'} as="p" className="eyebrow mb-3" />
      <Tx k={P + 'title'} as="h2" className="max-w-[28ch] font-display text-3xl leading-tight sm:text-4xl" />
      <p className="mt-2 max-w-[70ch] text-muted">{t(P + 'sub')}</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {CARDS.map(({ id, n }, i) => (
          <li
            key={id}
            className={`rounded-card p-4 sm:p-5 ${i === 0 ? 'bg-field text-white' : 'border border-line bg-surface'}`}
          >
            <Tx k={`${P}${id}.label`} as="p" className={`text-sm font-semibold ${i === 0 ? 'text-white/90' : 'text-muted'}`} />
            <p className="mt-2 break-words text-2xl font-semibold leading-tight sm:text-3xl">{t(`${P}${id}.value`, { n })}</p>
            <p className={`mt-1 text-sm ${i === 0 ? 'text-white/90' : 'text-muted'}`}>{t(`${P}${id}.unit`, VARS)}</p>
          </li>
        ))}
      </ul>

      <Tx k={P + 'fixTitle'} as="h3" className="mt-10 text-xl font-semibold" />
      {/* Phones: a swipe row so the page stays short; wider screens: a grid. */}
      <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {FIXES.map((id) => (
          <li key={id} className="w-[78%] shrink-0 snap-start border-t border-line pt-3 sm:w-auto">
            <Tx k={`${P}fix.${id}.title`} as="p" className="font-semibold" />
            <p className="mt-1 text-sm text-muted">{t(`${P}fix.${id}.body`)}</p>
          </li>
        ))}
      </ul>

      <details className="mt-6 max-w-[70ch] text-sm text-muted">
        <summary className="cursor-pointer py-2 font-semibold text-ink">{t(P + 'sourcesTitle')}</summary>
        <p className="mt-1">{t(P + 'method')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {SOURCES.map(([name, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
