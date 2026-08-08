import { useCallback, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import type { AxiosError } from 'axios'
import { authService } from '@/services/authService'
import type { SeekerRegisterPayload } from '@/services/authService'
import { API_BASE_URL } from '@/services/api'
import { AuthShell } from '@/components/ui/AuthShell'
import { TextField } from '@/components/ui/TextField'
import { PasswordField } from '@/components/ui/PasswordField'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography } from '@/theme'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

// Mirrors AuthController::register — regex:/^[\pL\s.'-]+$/u, min:2, max:100
const NAME_PATTERN = /^[\p{L}\s.'-]{2,100}$/u

const normalizeMobileNumber = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('639')) digits = `0${digits.slice(2)}`
  if (digits.startsWith('9')) digits = `0${digits}`
  return digits.slice(0, 11)
}

const firstServerError = (errors: Record<string, string[]> = {}) => {
  const firstKey = Object.keys(errors)[0]
  return firstKey ? errors[firstKey]?.[0] : ''
}

export default function RegisterScreen() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = useCallback((name: string, value: string) => {
    const nextValue = name === 'mobile_number' ? normalizeMobileNumber(value) : value
    setForm((current) => ({ ...current, [name]: nextValue }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
  }, [])

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!form.first_name?.trim()) {
      nextErrors.first_name = 'First name is required.'
    } else if (!NAME_PATTERN.test(form.first_name.trim())) {
      nextErrors.first_name = 'Use letters, spaces, periods, apostrophes, or hyphens only (2-100 characters).'
    }

    if (!form.last_name?.trim()) {
      nextErrors.last_name = 'Last name is required.'
    } else if (!NAME_PATTERN.test(form.last_name.trim())) {
      nextErrors.last_name = 'Use letters, spaces, periods, apostrophes, or hyphens only (2-100 characters).'
    }

    if (!form.email?.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Enter a valid email.'
    }

    if (!form.mobile_number?.trim()) {
      nextErrors.mobile_number = 'Mobile number is required.'
    } else if (!/^09\d{9}$/.test(normalizeMobileNumber(form.mobile_number))) {
      nextErrors.mobile_number = 'Use a valid PH mobile number, e.g. 09XXXXXXXXX.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      nextErrors.password = 'Minimum 8 characters.'
    }

    if (!form.password_confirmation) {
      nextErrors.password_confirmation = 'Please confirm password.'
    } else if (form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match.'
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    const payload: SeekerRegisterPayload = {
      role: 'seeker',
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile_number: normalizeMobileNumber(form.mobile_number),
      password: form.password,
      password_confirmation: form.password_confirmation,
    }

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.register(payload)
      router.push({
        pathname: '/(auth)/verify-email',
        params: {
          email: data.email ?? payload.email,
        },
      })
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorBody>
      const response = err.response

      if (response?.status === 422) {
        const serverErrors = response.data?.errors ?? {}
        const mappedErrors: Record<string, string> = {}
        Object.keys(serverErrors).forEach((key) => {
          mappedErrors[key] = serverErrors[key][0]
        })
        setErrors(mappedErrors)
        setApiError(firstServerError(serverErrors) || response.data?.message || 'Please check the highlighted fields.')
      } else if (!response) {
        const reason = err.code === 'ECONNABORTED' ? 'The request timed out.' : 'The backend could not be reached.'
        const detail = err.message ? ` ${err.message}` : ''
        setApiError(
          `${reason} Make sure it is running at ${API_BASE_URL} and both devices use the same Wi-Fi.${detail}`
        )
      } else {
        setApiError(response?.data?.message ?? 'Registration failed. Check your connection to the i-PESO backend.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = Boolean(form.password && form.password_confirmation && form.password === form.password_confirmation)

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register as a job seeker on your phone"
      onBack={() => router.back()}
      apiError={apiError}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.nameRow}>
        <View style={styles.nameHalf}>
          <TextField
            label="First Name"
            value={form.first_name ?? ''}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="Juan"
            error={errors.first_name}
          />
        </View>
        <View style={styles.nameHalf}>
          <TextField
            label="Last Name"
            value={form.last_name ?? ''}
            onChangeText={(v) => handleChange('last_name', v)}
            placeholder="Dela Cruz"
            error={errors.last_name}
          />
        </View>
      </View>

      <TextField
        label="Email Address"
        value={form.email ?? ''}
        onChangeText={(v) => handleChange('email', v)}
        placeholder="you@example.com"
        keyboardType="email-address"
        error={errors.email}
      />

      <TextField
        label="Mobile Number"
        value={form.mobile_number ?? ''}
        onChangeText={(v) => handleChange('mobile_number', v)}
        placeholder="09XXXXXXXXX"
        keyboardType="phone-pad"
        error={errors.mobile_number}
      />

      <PasswordField
        label="Password"
        value={form.password ?? ''}
        onChangeText={(v) => handleChange('password', v)}
        placeholder="Minimum 8 characters"
        error={errors.password}
      />
      <PasswordStrengthMeter password={form.password ?? ''} />

      <PasswordField
        label="Confirm Password"
        value={form.password_confirmation ?? ''}
        onChangeText={(v) => handleChange('password_confirmation', v)}
        placeholder="Re-enter your password"
        error={errors.password_confirmation}
      />
      {passwordsMatch ? <Text style={styles.matchText}>Passwords match</Text> : null}

      <Button fullWidth onPress={handleSubmit} disabled={isLoading} style={styles.submit}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameHalf: {
    flex: 1,
  },
  matchText: {
    color: colors.success,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.xs,
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
