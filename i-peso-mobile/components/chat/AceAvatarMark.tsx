import { useId } from 'react'
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'

/**
 * Small, static stand-in for AceMascot — sits next to each chat bubble where a full
 * animated rig would be overkill. Mirrors i-peso-frontend's AceAvatarMark.jsx palette
 * (body/gold/panel gradients) so Ace reads as the same character on both platforms.
 */
export function AceAvatarMark({ size = 28 }: { size?: number }) {
  const uid = useId()
  const bodyId = `aceAvatarBody-${uid}`
  const goldId = `aceAvatarGold-${uid}`
  const panelId = `aceAvatarPanel-${uid}`

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RadialGradient id={bodyId} cx="35%" cy="26%" r="85%">
          <Stop offset="0%" stopColor="#7FA6FF" />
          <Stop offset="50%" stopColor="#2F6FED" />
          <Stop offset="100%" stopColor="#153C9E" />
        </RadialGradient>
        <RadialGradient id={goldId} cx="35%" cy="26%" r="85%">
          <Stop offset="0%" stopColor="#FFF1C7" />
          <Stop offset="50%" stopColor="#FFC93C" />
          <Stop offset="100%" stopColor="#E08F00" />
        </RadialGradient>
        <LinearGradient id={panelId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E3EDFC" />
        </LinearGradient>
      </Defs>

      <Circle cx={16} cy={18} r={12} fill={`url(#${bodyId})`} />
      <Ellipse cx={12} cy={13.5} rx={4.2} ry={2.7} fill="#FFFFFF" opacity={0.3} rotation={-18} origin="12, 13.5" />

      <Rect x={14.5} y={5} width={3} height={6} rx={1.5} fill={`url(#${bodyId})`} />
      <Circle cx={16} cy={5} r={3.1} fill={`url(#${goldId})`} />

      <Rect x={7} y={13} width={18} height={11} rx={5} fill={`url(#${panelId})`} />
      <Ellipse cx={12.3} cy={18.6} rx={2.1} ry={2.6} fill="#122148" />
      <Ellipse cx={19.7} cy={18.6} rx={2.1} ry={2.6} fill="#122148" />
    </Svg>
  )
}
