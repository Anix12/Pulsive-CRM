import { useEffect, useRef, type RefObject } from 'react';

/** Walks up from `el` to find its nearest actually-scrollable ancestor — the dashboard
 *  shell scrolls its own `<main>` panel (`overflow-y-auto`), not `window`, and this
 *  avoids hardcoding a `<main>` selector that would silently break if the layout
 *  wrapping ever changes. */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Tracks scroll progress (0..1) of `anchorRef`'s nearest scrollable ancestor — written
 * into a ref, never React state, so scrolling never triggers a re-render. Consumers
 * read `.current` inside their own per-frame loop (e.g. R3F's `useFrame`), the same
 * pattern already used for pointer parallax in `DashboardHeroScene`.
 *
 * Progress is normalized against `settleDistance` px, not the scroll container's full
 * height — this is meant for a hero effect that's only visible while its own band is
 * still on screen (a few hundred px), so there's no reason to spread the response
 * across the whole page's scroll range.
 */
export function useScrollProgress(
  anchorRef: RefObject<HTMLElement | null>,
  settleDistance = 600,
  enabled = true,
) {
  const progress = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const scrollParent = findScrollParent(anchorRef.current);
    if (!scrollParent) return;

    let raf = 0;
    const measure = () => {
      progress.current = Math.min(1, Math.max(0, scrollParent.scrollTop / settleDistance));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    measure();
    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollParent.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [anchorRef, settleDistance, enabled]);

  return progress;
}
