/** 'smooth' unless the user asked for reduced motion (JS scrolling bypasses the CSS media query). */
export const scrollBehavior = (): ScrollBehavior =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
