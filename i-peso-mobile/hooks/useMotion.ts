import { useReducedMotion } from 'react-native-reanimated'
import { motion } from '@/theme'

/**
 * Single gate for every animation in the app.
 *
 * Honouring "Reduce Motion" is not optional — for users with vestibular disorders, the
 * scale/slide/parallax effects this app leans on can cause real nausea. Rather than leaving
 * that check to each call site (where it gets forgotten), every animated component pulls its
 * timings from here and gets zeroed durations automatically when the OS setting is on.
 *
 * Note that `enabled: false` returns duration 0 rather than skipping the animation: the end
 * state still applies, it just arrives instantly. That keeps conditional rendering identical
 * between the two modes, so there is only one code path to reason about.
 */
export function useMotion() {
  const reduced = useReducedMotion()

  return {
    /** False when the OS "Reduce Motion" setting is on. */
    enabled: !reduced,

    /** Duration in ms, collapsed to 0 when motion is reduced. */
    duration(key: keyof typeof motion.duration) {
      return reduced ? 0 : motion.duration[key]
    },

    /** Per-item entrance delay, collapsed to 0 when motion is reduced. */
    stagger(index: number) {
      if (reduced) return 0
      return Math.min(index, motion.staggerMax) * motion.stagger
    },

    /**
     * Spring config. When motion is reduced the spring is overdamped and stiff, which settles
     * in roughly a frame — visually instant, but still a spring, so worklet code stays uniform.
     */
    spring(key: keyof typeof motion.spring) {
      return reduced ? { damping: 100, stiffness: 1000, mass: 0.1 } : motion.spring[key]
    },

    /** Target scale for a press effect — 1 (no movement) when motion is reduced. */
    pressScale(key: keyof typeof motion.scale) {
      return reduced ? 1 : motion.scale[key]
    },
  }
}
