/**
 * Shared motion presets for consistent animations across all components.
 * Import these instead of writing inline motion configs.
 *
 * Usage:
 *   import { fadeIn, slideUp, spring } from '@/lib/animations';
 *   <motion.div {...slideUp} transition={spring}>...</motion.div>
 */

// ─── Enter / Exit Presets ───────────────────────────────────
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 16 },
};

export const slideDown = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ─── Transition Presets ─────────────────────────────────────
export const spring = { type: 'spring' as const, damping: 25, stiffness: 300 };
export const springFast = { type: 'spring' as const, damping: 30, stiffness: 500 };
export const springBouncy = { type: 'spring' as const, damping: 15, stiffness: 400 };
export const smooth = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] };

// ─── Stagger Children ──────────────────────────────────────
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerContainerSlow = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// ─── Hover / Tap ────────────────────────────────────────────
export const hoverScale = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } };
export const hoverLift = { whileHover: { y: -4, transition: { duration: 0.2 } } };
