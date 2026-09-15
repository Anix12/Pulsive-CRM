import { useCallback, useMemo, useRef } from 'react';
import { useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

const MAX_TILT_DEG = 3;
const RETURN_SPRING = { stiffness: 300, damping: 24, mass: 0.5 };

/**
 * Cheap CSS-only (well — framer-motion transform, no WebGL) pointer-tilt effect for
 * cards that should feel like they have depth on hover. Desktop fine-pointer only.
 *
 * Uses framer-motion motion values rather than a raw CSS `transform` because the
 * caller (`MetricCard`) is already a `motion.div` animating its own mount `y`/`opacity`
 * — framer-motion composes multiple transform-affecting motion values (x, y, rotateX,
 * rotateY, scale, ...) into one `transform` string on the same element. A plain CSS
 * class setting `transform` directly would fight framer-motion's inline style and one
 * of the two effects would silently lose.
 *
 * Usage: spread `bind` onto the motion.div; spread `style` onto its `style` prop.
 */
export function useTilt3D(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, RETURN_SPRING);
  const rotateY = useSpring(rawRotateY, RETURN_SPRING);
  const highlightX = useMotionValue(50);
  const highlightY = useMotionValue(50);
  const highlightOpacity = useSpring(0, RETURN_SPRING);
  const highlightBackground = useMotionTemplate`radial-gradient(180px circle at ${highlightX}% ${highlightY}%, rgba(255,255,255,0.35), transparent 70%)`;

  const isFinePointer = useMemo(
    () => enabled && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    [enabled],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFinePointer || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    rawRotateY.set((px - 0.5) * MAX_TILT_DEG * 2);
    rawRotateX.set((0.5 - py) * MAX_TILT_DEG * 2);
    highlightX.set(px * 100);
    highlightY.set(py * 100);
    highlightOpacity.set(1);
  }, [isFinePointer, rawRotateX, rawRotateY, highlightX, highlightY, highlightOpacity]);

  const onPointerLeave = useCallback(() => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    highlightOpacity.set(0);
  }, [rawRotateX, rawRotateY, highlightOpacity]);

  return {
    ref,
    bind: isFinePointer ? { onPointerMove, onPointerLeave } : {},
    /** Spread onto the motion.div's `style` prop. */
    style: isFinePointer ? { rotateX, rotateY, transformPerspective: 800 } : undefined,
    /** A motion.div positioned absolute/inset-0 inside the card renders the pointer-follow
     *  highlight — spread onto its `style` prop as `{ background: highlightBackground, opacity: highlightOpacity }`. */
    highlightStyle: { background: highlightBackground, opacity: highlightOpacity },
    isFinePointer,
  };
}
