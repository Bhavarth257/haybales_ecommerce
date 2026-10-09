'use client';
import { useEffect, useRef, useState } from 'react';
import { useRichMotion } from '../../lib/richMotion';

/** Counts up to `value` when scrolled into view (desktop rich-motion tier only; otherwise shows the final number). */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const rich = useRichMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!rich || !el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setShown(value * (1 - Math.pow(1 - p, 4))); // ease-out quart: fast start, soft landing
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0 });
    io.observe(el);
    return () => (io.disconnect(), cancelAnimationFrame(raf));
  }, [rich, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(rich ? (Number.isInteger(value) ? Math.round(shown ?? 0) : (shown ?? 0)) : value)}
    </span>
  );
}
