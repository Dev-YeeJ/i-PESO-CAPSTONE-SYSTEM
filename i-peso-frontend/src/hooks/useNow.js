import { useSyncExternalStore } from 'react'

// One shared clock for time-based labels ("Upcoming" → "Happening now" → "Call ended"),
// so a page left open flips on its own. A single timer serves every component using
// it, and it only runs while something is listening.
export const NOW_TICK_MS = 30_000

let now = Date.now()
let timer = null
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now() // fresh as soon as the first label appears
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((notify) => notify())
    }, NOW_TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      timer = null
    }
  }
}

/** The current time in ms, updated every 30 seconds. */
export function useNow() {
  return useSyncExternalStore(subscribe, () => now, () => now)
}
