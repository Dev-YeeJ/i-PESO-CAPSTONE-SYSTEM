import { ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { AlertBox } from './AlertBox'
import { colors, radii, spacing, textStyles, typography } from '@/theme'

interface AuthShellProps {
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  apiError?: string
  headerExtra?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared frame for Login, Register, Verify email, Forgot and Reset password (redesign "Auth"
 * drafts): the real i-PESO logo in a left-aligned brand row, a large left-aligned title, and
 * the form directly on white — no card, so the fields are the page.
 */
export function AuthShell({ title, subtitle, onBack, apiError, headerExtra, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.brandRow} accessible accessibilityLabel="i-PESO, Urdaneta City">
            <Image source={require('@/assets/images/ipeso-logo.png')} style={styles.logo} />
            <View>
              <Text style={styles.wordmark}>i-PESO</Text>
              <Text style={styles.logoSub}>URDANETA CITY</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {headerExtra}

        {apiError ? (
          <AlertBox variant="danger" style={styles.errorBox}>{apiError}</AlertBox>
        ) : null}

        <View style={styles.form}>{children}</View>

        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
  },
  backBtnPressed: {
    backgroundColor: colors.tint,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
  },
  wordmark: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: typography.family.bold,
    color: colors.primary,
  },
  logoSub: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.subtle,
    letterSpacing: 2,
    fontFamily: typography.family.medium,
  },
  title: {
    ...textStyles.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...textStyles.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.xs + 2,
  },
  errorBox: {
    marginTop: spacing.lg,
  },
  form: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
})
