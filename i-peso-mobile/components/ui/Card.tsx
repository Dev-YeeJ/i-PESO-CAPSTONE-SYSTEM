import { ReactNode } from 'react'
import { StyleSheet, View, Text, type ViewStyle, type TextStyle, type StyleProp } from 'react-native'
import { colors, radii, shadows, spacing, typography } from '@/theme'

type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  padding?: CardPadding
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

export function Card({ children, padding = 'lg', style, contentStyle }: CardProps) {
  return (
    <View style={[styles.card, styles[padding], style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  style?: StyleProp<ViewStyle>
  titleStyle?: StyleProp<TextStyle>
  subtitleStyle?: StyleProp<TextStyle>
}

export function CardHeader({ title, subtitle, action, style, titleStyle, subtitleStyle }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headText}>
        <Text style={[styles.headTitle, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.headSubtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  content: {
    width: '100%',
  },
  sm: {
    padding: spacing.md,
  },
  md: {
    padding: spacing.lg,
  },
  lg: {
    padding: spacing.xl,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headText: {
    flex: 1,
  },
  headTitle: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontFamily: typography.family.bold,
  },
  headSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.body,
    fontFamily: typography.family.regular,
  },
})
