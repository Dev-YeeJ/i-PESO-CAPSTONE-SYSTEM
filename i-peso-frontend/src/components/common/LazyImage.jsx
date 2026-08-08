import { useId, useState } from 'react'

/**
 * Deferred, layout-stable image — for company logos, profile photos, and
 * anything else fetched from user-controlled URLs.
 *
 * Deferral is native `loading="lazy"` (the browser skips the network request
 * until the image nears the viewport) — no IntersectionObserver needed, since
 * that is exactly what the native attribute already does. This component's
 * job is just the two things the browser attribute doesn't give you: a
 * placeholder while the fetch is in flight, and a caller-supplied fallback
 * (e.g. initials) when the URL 404s or the field is empty.
 *
 * `fallback` renders in place of the image, inheriting `className` — pass
 * whatever you'd have shown for "no photo" before (initials, an icon).
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  fallback = null,
  fetchPriority = 'auto',
  ...imgProps
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'empty')
  const skeletonId = useId()

  if (!src || status === 'error') {
    return fallback ?? <div className={`bg-slate-100 ${className}`} aria-hidden="true" />
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {status === 'loading' && (
        <div
          aria-hidden="true"
          id={skeletonId}
          className={`absolute inset-0 animate-pulse bg-slate-200 ${className}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        // Only meaningful with loading="lazy": tells the browser this image
        // is not the LCP candidate, so it doesn't compete with content that
        // actually is. Callers rendering an above-the-fold hero image should
        // override to "high".
        fetchPriority={fetchPriority}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={`${className} transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        {...imgProps}
      />
    </div>
  )
}
