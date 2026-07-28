import { ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { AlertBox } from './AlertBox'
import { Card } from './Card'
import { colors, radii, spacing, typography } from '@/theme'

interface AuthShellProps {
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  apiError?: string
  headerExtra?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, onBack, apiError, headerExtra, children, footer }: AuthShellProps) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="arrow-back" size={18} color={colors.secondaryText} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.logoArea}>
          <Image source={require('@/assets/images/ipeso-logo.png')} style={styles.logo} />
          <Text style={styles.wordmark}>i-PESO</Text>
          <Text style={styles.logoSub}>URDANETA CITY</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {headerExtra}

        {apiError ? (
          <AlertBox variant="danger" style={styles.errorBox}>{apiError}</AlertBox>
        ) : null}

        <Card padding="lg" style={styles.card}>
          {children}
        </Card>

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
    paddingTop: spacing.xxxl + spacing.md,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: typography.small,
    fontFamily: typography.family.bold,
    color: colors.secondaryText,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  wordmark: {
    fontSize: typography.title,
    fontFamily: typography.family.display,
    color: colors.primary,
  },
  logoSub: {
    fontSize: 10,
    color: colors.subtle,
    letterSpacing: 3,
    fontFamily: typography.family.bold,
    marginTop: 2,
  },
  title: {
    fontSize: typography.hero,
    fontFamily: typography.family.display,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body,
    fontFamily: typography.family.regular,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  errorBox: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.xl,
  },
})
