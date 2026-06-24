import type { Transition, Variants } from "framer-motion";

/**
 * Shared Framer Motion choreography for the imperial-lacquer redesign.
 *
 * Centralized here (rather than re-declared per screen) so every scene speaks
 * the same motion language: ceremonial, weighty entrances that "rise from ash"
 * and settle, plus the cinematic cross-fade between phases. Components import
 * these variants; the actual prefers-reduced-motion handling for the heavy
 * particle loops lives in the atmosphere layer (MysticBackdrop), while
 * Framer's own reducedMotion respects the OS setting for these transforms.
 */

/** A slow, settling ease — the house easing for the redesign. */
export const EASE_SETTLE: Transition["ease"] = [0.22, 1, 0.36, 1];

/**
 * Scene cross-fade for AnimatePresence around the phase switch in page.tsx.
 * The outgoing scene sinks and dims into the lacquer; the incoming one rises
 * out of it. Use with `mode="wait"` so they never overlap chaotically.
 */
export const sceneVariants: Variants = {
  initial: { opacity: 0, scale: 1.03, filter: "blur(6px)" },
  enter: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_SETTLE },
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    filter: "blur(6px)",
    transition: { duration: 0.5, ease: "easeIn" },
  },
};

/**
 * Stagger container — children animate in sequence so an ornate screen
 * assembles piece by piece rather than all at once. Pair with `riseFromAsh`.
 */
export const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: { staggerChildren: 0.14, delayChildren: 0.15 },
  },
};

/** A single element rising out of the ground with a touch of scale + glow. */
export const riseFromAsh: Variants = {
  initial: { opacity: 0, y: 22, scale: 0.97 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_SETTLE },
  },
};

/** Ornament that fades and breathes into place (frames, rings, seals). */
export const ornamentReveal: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.1, ease: EASE_SETTLE },
  },
};

/** A gentle, continuous float for free-standing ornament (lanterns, motes). */
export const driftFloat: Variants = {
  initial: { y: 0 },
  enter: {
    y: [0, -8, 0],
    transition: { duration: 7, ease: "easeInOut", repeat: Infinity },
  },
};
