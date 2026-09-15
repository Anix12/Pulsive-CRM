import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number from 0 to `target` over `duration`ms using requestAnimationFrame,
 * with an ease-out curve. Jumps straight to `target` when `skip` is true (reduced motion).
 */
export function useCountUp(target: number, duration = 800, skip = false) {
  const [value, setValue] = useState(skip ? target : 0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (skip) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setValue(from + (target - from) * easeOutCubic(t));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, skip]);

  return value;
}
