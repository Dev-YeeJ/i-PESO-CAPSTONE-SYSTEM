import { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii } from '@/theme'

type IconName = ComponentProps<typeof MaterialIcons>['name']
type Tone = 'info' | 'success' | 'warning' | 'danger'

interface IconBadgeProps {
  icon: IconName
  tone: Tone
  size?: number
}

const TONE_COLORS: Record<Tone, { icon: string; background: string; border: string }> = {
  info: { icon: colors.info, background: colors.infoBackground, border: colors.infoBorder },
  success: { icon: colors.success, background: colors.successBackground, border: colors.successBorder },
  warning: { icon: colors.warning, background: colors.warningBackground, border: colors.warningBorder },
  danger: { icon: colors.danger, background: colors.dangerBackground, border: colors.dangerBorder },
}

/**
 * The colored icon-in-a-circle badge used to open a full-screen status message (email sent,
 * password reset, etc). Was hand-duplicated with slightly different dimensions in two auth
 * screens; consolidated here so both actually match.
 */
export function IconBadge({ icon, tone, size = 76 }: IconBadgeProps) {
  const t = TONE_COLORS[tone]

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radii.xl, backgroundColor: t.background, borderColor: t.border },
      ]}
    >
      <MaterialIcons name={icon} size={Math.round(size * 0.45)} color={t.icon} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
