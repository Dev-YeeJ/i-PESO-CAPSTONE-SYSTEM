import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import type { AxiosError } from 'axios'
import { authService } from '@/services/authService'
import { API_BASE_URL } from '@/services/api'
import { AuthShell } from '@/components/ui/AuthShell'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { colors, typography } from '@/theme'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

const validateEmail = (email: string) => {
  if (!email.trim()) return 'Email is required.'
  if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address.'
  return ''
}

export default function ForgotPasswordScreen() {
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [apiError, setApiError]     = useState('')

  const handleSubmit = async () => {
    const error = validateEmail(email)
    setEmailError(error)
    if (error) return

    setIsLoading(true)
    setApiError('')

    const trimmedEmail = email.trim().toLowerCase()

    try {
      await authService.forgotPassword(trimmedEmail)
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: trimmedEmail, freshSent: '1' },
      })
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorBody>
      const response = err.response

      if (response?.status === 422) {
        const serverErrors = response.data?.errors ?? {}
        setEmailError(serverErrors.email?.[0] ?? '')
        setApiError(response.data?.message ?? 'Please check the email address and try again.')
      } else if (response?.status === 429) {
        setApiError('Too many attempts. Please wait a moment before trying again.')
      } else if (!response) {
        const reason = err.code === 'ECONNABORTED' ? 'The request timed out.' : 'The backend could not be reached.'
        setApiError(`${reason} Make sure it is running at ${API_BASE_URL} and both devices use the same Wi-Fi.`)
      } else {
        setApiError(response.data?.message ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your registered email address and we will send a six-digit reset code."
      onBack={() => router.back()}
      apiError={apiError}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <TextField
        label="Email Address"
        value={email}
        onChangeText={(v) => {
          setEmail(v)
          setApiError('')
          setEmailError('')
        }}
        onBlur={() => setEmailError(validateEmail(email))}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoFocus
        error={emailError}
      />

      <Button fullWidth onPress={handleSubmit} loading={isLoading} style={styles.submit}>
        Send Reset Code
      </Button>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  submit: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
})
