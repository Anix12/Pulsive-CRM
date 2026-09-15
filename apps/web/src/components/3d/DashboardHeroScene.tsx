'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SceneContainer } from './SceneContainer';
import { CRMOrbNetwork } from './CRMOrbNetwork';
import { useScrollProgress } from '@/lib/useScrollProgress';

const SCROLL_SETTLE_DISTANCE = 600;

const MOBILE_BREAKPOINT = '(max-width: 767px)';
const MAX_PARALLAX_RAD = 0.18;

/**
 * Ambient, decorative background scene for the main Dashboard. Sits behind the real
 * content (metric cards, charts) with `pointer-events-none` — it never intercepts a
 * click and never renders business data, only a conceptual CRM "network" metaphor.
 *
 * Self-gates on: reduced-motion (idle rotation/orbiting off, static pose), narrow
 * viewports (skipped entirely under the mobile breakpoint — cheaper and avoids fighting
 * for space with real content on small screens), and tab visibility (pauses the render
 * loop while the tab is hidden so it never burns GPU/battery in the background).
 *
 * Pointer parallax is written straight into a ref and read per-frame inside R3F's own
 * render loop — pointer movement never triggers a React re-render of this tree.
 */
export default function DashboardHeroScene() {
  const prefersReducedMotion = !!useReducedMotion();
  const [isMobile, setIsMobile] = useState(true); // default hidden until confirmed desktop, avoids a mobile flash
  const [visible, setVisible] = useState(true);
  const parallax = useRef({ x: 0, y: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  // Tracks the dashboard's own <main> scroll (found by walking up from this scene's own
  // DOM node — see useScrollProgress), not `window`, since the app shell scrolls its
  // <main> panel internally. Disabled under reduced motion, same as pointer parallax.
  const scrollProgress = useScrollProgress(anchorRef, SCROLL_SETTLE_DISTANCE, !prefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      parallax.current.x = nx * MAX_PARALLAX_RAD;
      parallax.current.y = ny * MAX_PARALLAX_RAD;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [prefersReducedMotion, isMobile]);

  if (isMobile) return null;

  return (
    <SceneContainer ref={anchorRef} className="absolute inset-0 pointer-events-none">
      {visible && (
        <CRMOrbNetwork parallax={parallax} scrollProgress={scrollProgress} reduceMotion={prefersReducedMotion} />
      )}
    </SceneContainer>
  );
}
