import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, vi } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// Toasts: tests never mount <Toaster/>, so a real toast renders nowhere. Stub the
// app's toast module once here; a test that asserts on toasts can still import
// '@/lib/toast' and read these spies, or vi.mock it itself.
vi.mock('@/lib/toast', () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn(),
  })
  return { default: toast, toast }
})

afterEach(() => {
  cleanup()
})

// ── jsdom gaps that Radix primitives (Dialog, Tooltip) rely on ──
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false },
  })
}

Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {})
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {})
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

// framer-motion's useInView needs IntersectionObserver; report everything as visible.
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback }
    observe(target) { this.callback([{ isIntersecting: true, target, intersectionRatio: 1 }], this) }
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
}
