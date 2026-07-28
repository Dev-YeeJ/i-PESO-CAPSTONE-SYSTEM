import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { AuthShell } from '@/components/ui/AuthShell'
import { TextField } from '@/components/ui/TextField'
import { PasswordField } from '@/components/ui/PasswordField'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography } from '@/theme'

interface AuthState {
  setAuth: (user: any, token: string) => Promise<void>
}

const validate = (email: string, password: string) => {
  const e: Record<string, string> = {}
  if (!email.trim())                    e.email    = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email.'
  if (!password)                        e.password = 'Password is required.'
  else if (password.length < 8)         e.password = 'Minimum 8 characters.'
  return e
}

export default function LoginScreen() {
  const setAuth = useAuthStore((s: AuthState) => s.setAuth)

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [apiError, setApiError]   = useState('')
  const [touched, setTouched]     = useState<Record<string, boolean>>({})

  const getError = (field: string) => touched[field] ? errors[field] : ''

  const handleBlur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(email, password))
  }

  const handleLogin = async () => {
    setTouched({ email: true, password: true })
    const errs = validate(email, password)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.login(email, password)
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
      setApiError(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    } finally {
      setIsLoading(false)
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
          <Text style={styles.adminNote}>For PESO Admin access, use the web portal.</Text>
        </View>
      }
    >
      <TextField
        label="Email Address"
        value={email}
        onChangeText={(v) => {
          setEmail(v)
          setApiError('')
          setErrors((e) => ({ ...e, email: '' }))
        }}
        onBlur={() => handleBlur('email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        error={getError('email')}
      />

      <PasswordField
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v)
          setApiError('')
          setErrors((e) => ({ ...e, password: '' }))
        }}
        onBlur={() => handleBlur('password')}
        placeholder="Enter your password"
        error={getError('password')}
        labelRight={
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        }
      />

      <Button fullWidth onPress={handleLogin} disabled={isLoading} style={styles.submit}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  forgotLink: {
    fontSize: typography.small,
    color: colors.info,
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
    color: colors.secondaryText,
  },
  footerLink: {
    fontSize: typography.body,
    color: colors.info,
    fontFamily: typography.family.bold,
  },
  adminNote: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.subtle,
  },
})
