import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { AuthShell } from '@/components/ui/AuthShell'
import { TextField } from '@/components/ui/TextField'
import { PasswordField } from '@/components/ui/PasswordField'
import { Button } from '@/components/ui/Button'
import { loginSchema, type LoginFormValues } from '@/schemas/authSchemas'
import { colors, spacing, typography } from '@/theme'

interface AuthState {
  setAuth: (user: any, token: string) => Promise<void>
  sessionMessage: string | null
  clearSessionMessage: () => void
}

export default function LoginScreen() {
  const setAuth = useAuthStore((s: AuthState) => s.setAuth)
  const sessionMessage = useAuthStore((s: AuthState) => s.sessionMessage)
  const clearSessionMessage = useAuthStore((s: AuthState) => s.clearSessionMessage)

  const [apiError, setApiError] = useState('')

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  // Landing here because a stored session was evicted (e.g. this account
  // signed in on another device) shows that reason once, then clears it —
  // a normal cold-start visit to /login has no sessionMessage set.
  useEffect(() => {
    if (sessionMessage) {
      setApiError(sessionMessage)
      clearSessionMessage()
    }
  }, [sessionMessage, clearSessionMessage])

  const onSubmit = async (values: LoginFormValues) => {
    setApiError('')

    try {
      const data = await authService.login(values.email, values.password)
      if (data.user.role !== 'seeker') {
        setApiError('This app is for Job Seekers only. Use the web portal.')
        return
      }

      await setAuth(data.user, data.token)
      router.replace(data.user.profile_completed ? '/(seeker)' : '/onboarding')
    } catch (err: any) {
      const status = err.response?.status
      if (status === 403 && err.response?.data?.email_unverified) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: {
            email: err.response.data.email,
          },
        })
        return
      }
      if (status === 429) {
        // Covers both the 5-failed-attempts/15-min lockout and the plain
        // 10/min route throttle — the backend's own message distinguishes
        // them; this branch just keeps either from being shown as a
        // "check your credentials" error, which would be misleading.
        setApiError(err.response?.data?.message ?? 'Too many attempts. Please wait a moment before trying again.')
        return
      }
      setApiError(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your i-PESO account"
      apiError={apiError}
      footer={
        <View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Do not have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <TextField
            label="Email Address"
            value={value}
            onChangeText={(v) => {
              onChange(v)
              setApiError('')
            }}
            onBlur={onBlur}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <PasswordField
            label="Password"
            value={value}
            onChangeText={(v) => {
              onChange(v)
              setApiError('')
            }}
            onBlur={onBlur}
            placeholder="Enter your password"
            error={error?.message}
            labelRight={
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            }
          />
        )}
      />

      <Button fullWidth onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submit}>
        Sign In
      </Button>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  forgotLink: {
    fontSize: typography.small,
    color: colors.secondary,
    fontFamily: typography.family.bold,
  },
  submit: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  footerText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.body,
    color: colors.secondary,
    fontFamily: typography.family.bold,
  },
  adminNote: {
    textAlign: 'center',
    fontSize: typography.label,
    color: colors.subtle,
  },
})
