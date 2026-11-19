import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors } from '@/theme'

// Bespoke blue line-art for empty / error states (redesign "States" on the components page).
// Static SVG on purpose: an empty state should be calm, and these stay crisp at any density.

type Kind = 'search' | 'folder' | 'bell' | 'cloud' | 'star' | 'shield' | 'pin'

const B6 = colors.blue600
const B3 = colors.blue300
const B2 = colors.blue200
const B1 = colors.blue100
const W = colors.white

export function EmptyArt({ kind, size = 84 }: { kind: Kind; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === 'search' ? (
        <>
          <Rect x={12} y={18} width={46} height={54} rx={8} fill={W} stroke={B3} strokeWidth={2} />
          <Rect x={20} y={28} width={26} height={5} rx={2.5} fill={B2} />
          <Rect x={20} y={38} width={30} height={4} rx={2} fill={B1} />
          <Rect x={20} y={46} width={20} height={4} rx={2} fill={B1} />
          <Circle cx={56} cy={52} r={14} fill={W} stroke={B6} strokeWidth={3} />
          <Path d="M66 62l9 9" stroke={B6} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : kind === 'folder' ? (
        <>
          <Path d="M12 26a6 6 0 0 1 6-6h16l6 6h26a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill={W} stroke={B3} strokeWidth={2} />
          <Path d="M30 46l8 8 16-16" stroke={B6} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : kind === 'bell' ? (
        <>
          <Path d="M42 16c-11 0-18 8-18 19v12l-6 9h48l-6-9V35c0-11-7-19-18-19z" fill={W} stroke={B6} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M35 62a7 7 0 0 0 14 0" stroke={B6} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={60} cy={22} r={6} fill={B2} />
        </>
      ) : kind === 'cloud' ? (
        <>
          <Path d="M26 58h34a12 12 0 0 0 1-24 18 18 0 0 0-34-3 13 13 0 0 0-1 27z" fill={W} stroke={B3} strokeWidth={2.5} />
          <Path d="M36 40l12 12M48 40L36 52" stroke={B6} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : kind === 'star' ? (
        <>
          <Rect x={14} y={20} width={56} height={44} rx={10} fill={W} stroke={B3} strokeWidth={2} />
          <Path d="M42 30l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill={B1} stroke={B6} strokeWidth={2.5} strokeLinejoin="round" />
        </>
      ) : kind === 'shield' ? (
        <>
          <Path d="M42 14l24 9v18c0 15-10 26-24 30-14-4-24-15-24-30V23z" fill={W} stroke={B6} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M32 42l7 7 13-14" stroke={B6} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M42 70s20-18 20-34a20 20 0 0 0-40 0c0 16 20 34 20 34z" fill={W} stroke={B6} strokeWidth={3} />
          <Circle cx={42} cy={36} r={7} fill={B2} stroke={B6} strokeWidth={2.5} />
        </>
      )}
    </Svg>
  )
}

export type EmptyArtKind = Kind
