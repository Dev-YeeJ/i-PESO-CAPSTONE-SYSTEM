import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

// Mirrors i-peso-frontend/src/hooks/useNow.js: one shared clock for time-based labels
// ("Upcoming" → "Happening now" → "Call ended"), so a screen left open flips on its own.
// A single timer serves every component using it, and it only runs while something is
// listening. Phones pause timers in the background, so the clock also catches up the
// moment the app comes back to the foreground.
export const NOW_TICK_MS = 30_000

let now = Date.now()
let timer: ReturnType<typeof setInterval> | null = null
let appStateSubscription: { remove: () => void } | null = null
const listeners = new Set<() => void>()

function tick() {
  now = Date.now()
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now() // fresh as soon as the first label appears
    timer = setInterval(tick, NOW_TICK_MS)
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick()
    })
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      if (timer) clearInterval(timer)
      timer = null
      appStateSubscription?.remove()
      appStateSubscription = null
    }
  }
}

/** The current time in ms, updated every 30 seconds and when the app returns to the foreground. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => now)
}
