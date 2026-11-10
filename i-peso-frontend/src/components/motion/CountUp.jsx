import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1]

/**
 * A number that counts up when it scrolls into view. Screen readers get the
 * final value straight away, and people who prefer reduced motion see it
 * without the animation.
 */
export default function CountUp({ value, decimals = 0, suffix = '', className }) {
  const ref = useRef(null)
  const from = useRef(0)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(0)
  const target = Number(value) || 0

  useEffect(() => {
    if (!inView || reduce) return undefined
    const controls = animate(from.current, target, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (latest) => setShown(latest),
      onComplete: () => { from.current = target },
    })
    return () => controls.stop()
  }, [inView, reduce, target])

  const text = (current) => `${current.toFixed(decimals)}${suffix}`

  return (
    <span className={cn('tabular-nums', className)}>
      <span ref={ref} aria-hidden="true">{text(reduce ? target : shown)}</span>
      <span className="sr-only">{text(target)}</span>
    </span>
  )
}
