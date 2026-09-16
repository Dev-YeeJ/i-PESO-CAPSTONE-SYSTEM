import { useId } from 'react'

/**
 * Static, small-footprint stand-in for AceMascot — used next to each chat
 * bubble where a full animated rig would be overkill (and where AceMascot's
 * own id-based CSS selectors assume a single instance on the page).
 * Mirrors the rig's body/antenna/panel palette so Ace stays recognizable
 * even at avatar size.
 */
export default function AceAvatarMark({ className = '' }) {
  const uid = useId()
  const bodyId = `aceAvatarBody-${uid}`
  const goldId = `aceAvatarGold-${uid}`
  const panelId = `aceAvatarPanel-${uid}`

  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Ace">
      <defs>
        <radialGradient id={bodyId} cx="35%" cy="26%" r="85%">
          <stop offset="0%" stopColor="#7FA6FF" />
          <stop offset="50%" stopColor="#2F6FED" />
          <stop offset="100%" stopColor="#153C9E" />
        </radialGradient>
        <radialGradient id={goldId} cx="35%" cy="26%" r="85%">
          <stop offset="0%" stopColor="#FFF1C7" />
          <stop offset="50%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#E08F00" />
        </radialGradient>
        <linearGradient id={panelId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E3EDFC" />
        </linearGradient>
      </defs>

      <circle cx="16" cy="18" r="12" fill={`url(#${bodyId})`} />
      <ellipse cx="12" cy="13.5" rx="4.2" ry="2.7" fill="#FFFFFF" opacity="0.3" transform="rotate(-18 12 13.5)" />

      <rect x="14.5" y="5" width="3" height="6" rx="1.5" fill={`url(#${bodyId})`} />
      <circle cx="16" cy="5" r="3.1" fill={`url(#${goldId})`} />

      <rect x="7" y="13" width="18" height="11" rx="5" fill={`url(#${panelId})`} />
      <ellipse cx="12.3" cy="18.6" rx="2.1" ry="2.6" fill="#122148" />
      <ellipse cx="19.7" cy="18.6" rx="2.1" ry="2.6" fill="#122148" />
    </svg>
  )
}
