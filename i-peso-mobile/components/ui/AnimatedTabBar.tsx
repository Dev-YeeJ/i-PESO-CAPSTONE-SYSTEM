import { useState } from 'react'
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'

type IconName = React.ComponentProps<typeof MaterialIcons>['name']

/** Icon per route. Kept here so the tab bar owns its own presentation. */
const ICONS: Record<string, IconName> = {
  index: 'home',
  jobs: 'work-outline',
  applications: 'task-alt',
  'government-programs': 'school',
  profile: 'person-outline',
}

/**
 * Tab bar with a gradient pill that slides between destinations.
 *
 * The pill is a single shared element that translates, rather than a highlight that fades in
 * and out per tab — the continuous movement is what communicates "you moved across a set",
 * and it costs one animated node instead of five.
 */
export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const m = useMotion()
  const insets = useSafeAreaInsets()
  const [barWidth, setBarWidth] = useState(0)

  // Routes registered with `href: null` are detail screens that live in this navigator but
  // must not appear as destinations. Expo Router's Tabs wrapper strips `href` off `options`
  // before it reaches a custom tab bar and converts it into `tabBarItemStyle: { display: 'none' }`
  // instead (see expo-router/build/layouts/TabsClient.js) — options.href is always undefined
  // here regardless of what was declared, so that has to be checked instead.
  const visibleRoutes = state.routes.filter((route) => {
    const style = descriptors[route.key]?.options.tabBarItemStyle as { display?: string } | undefined
    return style?.display !== 'none'
  })

  const activeIndex = visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key)
  const tabWidth = barWidth > 0 ? barWidth / visibleRoutes.length : 0

  // Derived rather than set in an effect: the pill follows the navigator's index directly, so
  // it stays correct through back-gestures and deep links, not just taps.
  const pillX = useDerivedValue(() =>
    withSpring(Math.max(activeIndex, 0) * tabWidth, m.spring('snappy')),
  )

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: pillX.value }],
    opacity: tabWidth > 0 && activeIndex >= 0 ? 1 : 0,
  }))

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width)
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.track} onLayout={handleLayout}>
        <Animated.View style={[styles.pillWrap, pillStyle]} pointerEvents="none">
          <LinearGradient
            colors={[...gradients.cta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pill}
          />
        </Animated.View>

        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name
          const focused = index === activeIndex

          const onPress = () => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } else {
              Haptics.selectionAsync()
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <TabContent icon={ICONS[route.name] ?? 'circle'} label={label} focused={focused} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function TabContent({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  const m = useMotion()

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.06 : 1, m.spring('snappy')) }],
  }))

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.75, { duration: m.duration('quick') }),
  }))

  return (
    <>
      <Animated.View style={iconStyle}>
        <MaterialIcons name={icon} size={22} color={focused ? colors.white : colors.subtle} />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: focused ? colors.white : colors.subtle },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...shadows.elevated,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
  },
  pillWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    paddingHorizontal: spacing.xs,
  },
  pill: {
    flex: 1,
    borderRadius: radii.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  label: {
    ...textStyles.label,
  },
})
