import { useEffect, useId } from 'react'
import { StyleSheet } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'

const AnimatedG = Animated.createAnimatedComponent(G)

export type AceState = 'idle' | 'greeting' | 'listening' | 'thinking' | 'success' | 'error'

/**
 * Ace, animated. A React Native port of i-peso-frontend's AceMascot.jsx rig — same palette
 * and silhouette (blue body, gold antenna/hands, navy face panel), reimplemented with a
 * Reanimated-driven subset of its states rather than the full CSS keyframe rig, since RN has
 * no CSS transitions: a continuous idle float + blink, a one-shot greeting wave, pulsing
 * "thinking" dots, a happy bounce + sparkle burst on success, and a concerned shake on error.
 */
export function AceMascot({ state = 'idle', size = 96 }: { state?: AceState; size?: number }) {
  const uid = useId()
  const bodyId = `aceBody-${uid}`
  const goldId = `aceGold-${uid}`
  const m = useMotion()

  const floatY = useSharedValue(0)
  const armRotate = useSharedValue(0)
  const blink = useSharedValue(1)
  const shakeX = useSharedValue(0)
  const bodyScale = useSharedValue(1)
  const dotsOpacity = useSharedValue(0)
  const sparkleScale = useSharedValue(0)

  // Continuous idle float — always running, independent of state, so Ace never looks frozen.
  useEffect(() => {
    if (!m.enabled) return
    floatY.value = withRepeat(withSequence(withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1, false)
    return () => cancelAnimation(floatY)
  }, [m.enabled, floatY])

  // Occasional blink — a held-open state would read as a static illustration, not a character.
  useEffect(() => {
    if (!m.enabled) return
    blink.value = withRepeat(withSequence(withTiming(1, { duration: 2600 }), withTiming(0.08, { duration: 90 }), withTiming(1, { duration: 90 })), -1, false)
    return () => cancelAnimation(blink)
  }, [m.enabled, blink])

  useEffect(() => {
    if (!m.enabled) {
      armRotate.value = 0
      dotsOpacity.value = state === 'thinking' ? 1 : 0
      sparkleScale.value = state === 'success' ? 1 : 0
      return
    }

    if (state === 'greeting') {
      armRotate.value = withSequence(
        withTiming(-26, { duration: 220 }),
        withRepeat(withSequence(withTiming(-8, { duration: 160 }), withTiming(-26, { duration: 160 })), 3, true),
        withTiming(0, { duration: 220 })
      )
    } else if (armRotate.value !== 0) {
      armRotate.value = withTiming(0, { duration: 200 })
    }

    if (state === 'thinking') {
      dotsOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.25, { duration: 380 })), -1, true)
    } else {
      dotsOpacity.value = withTiming(0, { duration: 150 })
    }

    if (state === 'success') {
      bodyScale.value = withSequence(withTiming(1.08, { duration: 160 }), withTiming(1, { duration: 220 }))
      sparkleScale.value = withSequence(withTiming(1, { duration: 180 }), withDelay(500, withTiming(0, { duration: 220 })))
    }

    if (state === 'error') {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withRepeat(withSequence(withTiming(6, { duration: 60 }), withTiming(-6, { duration: 60 })), 2, true),
        withTiming(0, { duration: 60 })
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, m.enabled])

  const rigProps = useAnimatedProps(() => ({
    transform: [{ translateY: floatY.value + Math.sin(shakeX.value) * 0 }, { translateX: shakeX.value }, { scale: bodyScale.value }] as unknown as string,
  }))
  const armProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${armRotate.value}deg` }] as unknown as string,
  }))
  const eyeProps = useAnimatedProps(() => ({ ry: 32 * blink.value }))
  const dotsProps = useAnimatedProps(() => ({ opacity: dotsOpacity.value }))
  const sparkleProps = useAnimatedProps(() => ({ opacity: sparkleScale.value, transform: [{ scale: 0.6 + 0.4 * sparkleScale.value }] as unknown as string }))

  const mouth = mouthFor(state)

  return (
    <Svg width={size} height={size} viewBox="0 0 640 560" style={styles.svg}>
      <Defs>
        <RadialGradient id={bodyId} cx="32%" cy="26%" r="82%">
          <Stop offset="0%" stopColor="#7FA6FF" />
          <Stop offset="45%" stopColor="#2F6FED" />
          <Stop offset="100%" stopColor="#153C9E" />
        </RadialGradient>
        <RadialGradient id={goldId} cx="35%" cy="28%" r="82%">
          <Stop offset="0%" stopColor="#FFF1C7" />
          <Stop offset="45%" stopColor="#FFC93C" />
          <Stop offset="100%" stopColor="#E08F00" />
        </RadialGradient>
      </Defs>

      <AnimatedG animatedProps={rigProps} origin="320, 320">
        {/* ground shadow */}
        <Ellipse cx={320} cy={480} rx={132} ry={18} fill="#0A1530" opacity={0.12} />

        {/* left arm (static) */}
        <G>
          <Rect x={83} y={285} width={85} height={30} rx={15} fill={`url(#${bodyId})`} />
          <Circle cx={83} cy={300} r={22} fill={`url(#${goldId})`} />
        </G>

        {/* right arm (waves on greeting) */}
        <AnimatedG animatedProps={armProps} origin="490, 303">
          <Rect x={467} y={288} width={90} height={30} rx={15} fill={`url(#${bodyId})`} />
          <Circle cx={557} cy={303} r={22} fill={`url(#${goldId})`} />
        </AnimatedG>

        {/* body */}
        <Circle cx={320} cy={290} r={155} fill={`url(#${bodyId})`} />
        <Ellipse cx={267} cy={234} rx={48} ry={30} fill="#FFFFFF" opacity={0.38} rotation={-18} origin="267, 234" />

        {/* chest button */}
        <Circle cx={320} cy={400} r={22} fill={`url(#${bodyId})`} />
        <Circle cx={320} cy={400} r={8} fill={`url(#${goldId})`} />

        {/* antenna */}
        <Rect x={317} y={90} width={6} height={48} rx={3} fill={`url(#${bodyId})`} />
        <Circle cx={320} cy={82} r={14} fill={`url(#${goldId})`} />

        {/* thinking dots */}
        <AnimatedG animatedProps={dotsProps}>
          <Circle cx={300} cy={58} r={5} fill="#FFC93C" />
          <Circle cx={320} cy={48} r={5} fill="#FFC93C" />
          <Circle cx={340} cy={58} r={5} fill="#FFC93C" />
        </AnimatedG>

        {/* success sparkles */}
        <AnimatedG animatedProps={sparkleProps} origin="320, 200">
          <SparkleStar cx={232} cy={150} s={12} color="#FFC93C" />
          <SparkleStar cx={408} cy={150} s={12} color="#FFC93C" />
          <SparkleStar cx={200} cy={260} s={9} color="#2F6FED" />
          <SparkleStar cx={440} cy={260} s={9} color="#2F6FED" />
        </AnimatedG>

        {/* face panel */}
        <G>
          <Rect x={210} y={205} width={220} height={150} rx={42} fill="#FFFFFF" />
          <Circle cx={228} cy={300} r={11} fill="#FFEDBB" opacity={0.85} />
          <Circle cx={412} cy={300} r={11} fill="#FFEDBB" opacity={0.85} />

          <AnimatedEllipse cx={270} cy={270} rx={26} animatedProps={eyeProps} />
          <AnimatedEllipse cx={370} cy={270} rx={26} animatedProps={eyeProps} />

          <Path d={mouth} stroke="#122148" strokeWidth={6} fill={mouth.includes('Z') ? '#122148' : 'none'} strokeLinecap="round" />
        </G>
      </AnimatedG>
    </Svg>
  )
}

function AnimatedEllipse({ cx, cy, rx, animatedProps }: { cx: number; cy: number; rx: number; animatedProps: ReturnType<typeof useAnimatedProps> }) {
  const AnimatedEllipseEl = Animated.createAnimatedComponent(Ellipse)
  return <AnimatedEllipseEl cx={cx} cy={cy} rx={rx} fill="#122148" animatedProps={animatedProps} />
}

function SparkleStar({ cx, cy, s, color }: { cx: number; cy: number; s: number; color: string }) {
  const d = `M${cx} ${cy - s} l${s / 3} ${s} ${s} ${s / 3} -${s} ${s / 3} -${s / 3} ${s} -${s / 3} -${s} -${s} -${s / 3} ${s} -${s / 3} z`
  return <Path d={d} fill={color} />
}

function mouthFor(state: AceState): string {
  if (state === 'success') return 'M288 312 Q320 348 352 312 Q320 334 288 312 Z'
  if (state === 'error') return 'M298 326 Q320 316 342 326'
  if (state === 'listening') return 'M310 321 a10 7 0 1 0 20 0 a10 7 0 1 0 -20 0'
  if (state === 'thinking') return 'M298 322 L342 322'
  return 'M295 318 Q320 336 345 318'
}

const styles = StyleSheet.create({
  svg: { overflow: 'visible' },
})
