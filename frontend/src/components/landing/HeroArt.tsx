'use client';
import { lazy, Suspense, useState, useSyncExternalStore } from 'react';

// Only desktop browsers that welcome motion ever request this chunk (and `three` with it).
const BaleScene = lazy(() => import('./BaleScene'));

const QUERY = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      webgl = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getSnapshot = () => window.matchMedia(QUERY).matches && hasWebGL();
const getServerSnapshot = () => false;

/** Simple geometric field scene: sun, furrows, round bales. Inline so it costs no request. */
function FieldArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={label} className="h-auto w-full rounded-card border border-line bg-straw-soft">
      <circle cx="300" cy="92" r="44" className="fill-straw" />
      <path d="M0 170 Q200 150 400 170 V300 H0 Z" className="fill-field-soft" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${-40 + i * 80} 300 L${150 + i * 22} 172`} className="stroke-field/30" strokeWidth="3" fill="none" />
      ))}
      {[
        [96, 214, 30],
        [168, 236, 36],
        [262, 206, 26],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={r} className="fill-straw stroke-[#8a6420]" strokeWidth="3" />
          <circle cx={cx} cy={cy} r={r * 0.55} className="fill-none stroke-[#8a6420]/60" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Hero visual. Static HTML and phones get the flat SVG with CSS-drifting clay bales.
 * Desktop (fine pointer, motion welcome, WebGL) lazy-loads the 3D bale scene and crossfades to it after its first frame.
 * The box keeps the flat art's size, so swapping never shifts layout; the canvas spills past it but ignores the pointer.
 */
export function HeroArt({ label }: { label: string }) {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const show3d = desktop && !failed;
  const on = show3d && ready;

  return (
    <div className="relative mx-auto w-full max-w-md md:max-w-none">
      <div className={`relative transition-opacity duration-[400ms] ease-out ${on ? 'opacity-0' : 'opacity-100'}`}>
        <FieldArt label={label} />
        {/* Drifting clay bales (decorative). */}
        <span aria-hidden className="clay drift absolute -left-3 top-6" style={{ '--s': '3.25rem', '--dy': '-110px', '--spin': '60deg' } as React.CSSProperties} />
        <span aria-hidden className="clay drift absolute -right-2 -top-4" style={{ '--s': '2.25rem', '--dy': '-60px', '--spin': '-45deg' } as React.CSSProperties} />
        <span aria-hidden className="clay drift absolute -bottom-3 right-16" style={{ '--s': '1.5rem', '--dy': '-140px', '--spin': '90deg' } as React.CSSProperties} />
      </div>
      {show3d && (
        <div
          aria-hidden
          className={`pointer-events-none absolute -bottom-8 -left-28 -right-12 -top-24 transition-opacity duration-[400ms] ease-out ${on ? 'opacity-100' : 'opacity-0'}`}
        >
          <Suspense fallback={null}>
            <BaleScene onReady={() => setReady(true)} onFail={() => setFailed(true)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
