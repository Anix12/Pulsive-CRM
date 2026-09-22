'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

// CRM brand blue (matches the indigo-600 used across buttons/accents app-wide).
const CURSOR_COLOR = '#4f46e5';

/**
 * Replaces the system cursor within the dashboard shell with a branded blue arrow
 * that trails the pointer with a light spring lag, and plays a quick scale + ripple
 * "click" animation on mousedown — a bespoke equivalent of the referenced cursor-click
 * animation, redrawn in the CRM's own color rather than using the (paid, licensed)
 * Iconscout Lottie asset directly.
 *
 * Disabled entirely for touch/coarse-pointer devices and for prefers-reduced-motion,
 * where it falls back to the normal system cursor.
 */
export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [clicking, setClicking] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 800, damping: 45, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 800, damping: 45, mass: 0.4 });

  useEffect(() => {
    if (reduceMotion) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    setEnabled(true);
    document.documentElement.classList.add('custom-cursor-active');

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);
    const onLeave = () => { x.set(-100); y.set(-100); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [reduceMotion, x, y]);

  if (!enabled || reduceMotion) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{ x: springX, y: springY }}
    >
      <div className="relative -translate-x-[2px] -translate-y-[2px]">
        <AnimatePresence>
          {clicking && (
            <motion.span
              key="ripple"
              className="absolute left-1 top-1 rounded-full"
              style={{ border: `2px solid ${CURSOR_COLOR}` }}
              initial={{ width: 6, height: 6, opacity: 0.55 }}
              animate={{ width: 34, height: 34, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <motion.div
          animate={{ scale: clicking ? 0.82 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          style={{ filter: `drop-shadow(0 2px 3px ${CURSOR_COLOR}66)` }}
        >
          <MousePointer2 size={24} fill={CURSOR_COLOR} color="white" strokeWidth={1.5} />
        </motion.div>
      </div>
    </motion.div>
  );
}
