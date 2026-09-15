// Shared motion tokens for the dashboard shell (sidebar, tab/filter controls, card
// containers). Keep every duration/easing here so timing stays consistent and is easy
// to tune in one place instead of hardcoded per-component.
import type { Transition } from 'framer-motion';

/** Hover/active-state transitions (bg, color) — Goal 1a/1c. */
export const HOVER_TRANSITION: Transition = { duration: 0.15, ease: 'easeOut' };

/** Springy click/tap bounce for nav icons — Goal 1b. */
export const TAP_SPRING: Transition = { type: 'spring', stiffness: 500, damping: 15, mass: 0.5 };

/** Shared-layout tab/pill indicator sliding between positions — Goal 2a. */
export const PILL_SPRING: Transition = { type: 'spring', stiffness: 500, damping: 35 };

/** Card mount fade + slide-up — Goal 3a. */
export const CARD_MOUNT_TRANSITION: Transition = { duration: 0.3, ease: 'easeOut' };
export const CARD_MOUNT_STAGGER = 0.05; // seconds between each card in a group
export const CARD_MOUNT_INITIAL = { opacity: 0, y: 8 };
export const CARD_MOUNT_ANIMATE = { opacity: 1, y: 0 };

/** Card hover lift — Goal 3b. */
export const CARD_HOVER_LIFT = { y: -2 };
export const CARD_HOVER_TRANSITION: Transition = { duration: 0.15, ease: 'easeOut' };

export const cardMountProps = (index: number, reduceMotion: boolean) =>
  reduceMotion
    ? {}
    : {
        initial: CARD_MOUNT_INITIAL,
        animate: CARD_MOUNT_ANIMATE,
        transition: { ...CARD_MOUNT_TRANSITION, delay: index * CARD_MOUNT_STAGGER },
      };
