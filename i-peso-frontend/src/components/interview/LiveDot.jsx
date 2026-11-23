/**
 * Pulsing dot for "Happening now". Decorative: the label next to it says the same
 * thing, so screen readers skip it. The pulse stops for people who prefer reduced
 * motion. `light` is for use on a green background.
 */
export default function LiveDot({ light = false, className = '' }) {
  return (
    <span className={`relative inline-flex h-2 w-2 shrink-0 ${className}`} aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${light ? 'bg-white' : 'bg-emerald-400'}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${light ? 'bg-white' : 'bg-emerald-500'}`} />
    </span>
  )
}
