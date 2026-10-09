'use client';
import { useSyncExternalStore } from 'react';

/** Desktop "rich motion" tier: big screen, fine pointer, motion welcome. Phones always get the light tier. */
export const RICH_MOTION_QUERY = '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

const subscribe = (fn: () => void) => {
  const m = window.matchMedia(RICH_MOTION_QUERY);
  m.addEventListener('change', fn);
  return () => m.removeEventListener('change', fn);
};

export const useRichMotion = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(RICH_MOTION_QUERY).matches, () => false);
