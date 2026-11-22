import { useEffect, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Counts up from 0 to `to` (ease-out) after `delayMs`; shows the final number at once with reduced motion. */
export function useCountUp(to: number, ms = 800, delayMs = 0): number {
  const [value, setValue] = useState(() => (reducedMotion() ? to : 0));
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now + delayMs;
      const p = Math.min(1, Math.max(0, (now - start) / ms));
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delayMs]);
  return reducedMotion() ? to : value;
}
