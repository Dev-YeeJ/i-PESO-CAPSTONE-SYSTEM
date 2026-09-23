import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AxiosError } from 'axios'
import { authService } from '@/services/authService'
import type { SeekerRegisterPayload } from '@/services/authService'
import { API_BASE_URL } from '@/services/api'
import { AuthShell } from '@/components/ui/AuthShell'
import { TextField } from '@/components/ui/TextField'
import { PasswordField } from '@/components/ui/PasswordField'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { Button } from '@/components/ui/Button'
import { registerSchema, type RegisterFormValues } from '@/schemas/authSchemas'
import { colors, spacing, typography } from '@/theme'
import { useToast } from '@/stores/toastStore'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

const normalizeMobileNumber = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('639')) digits = `0${digits.slice(2)}`
  if (digits.startsWith('9')) digits = `0${digits}`
  return digits.slice(0, 11)
}

// Mirrors i-peso-frontend's SeekerRegistration.jsx squish()/formatName() exactly —
// collapse repeated whitespace, then title-case after each separator (space/hyphen/apostrophe).
const squish = (value: string) => value.trim().replace(/\s+/g, ' ')

const formatName = (value: string) =>
  squish(value)
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_match, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`)

const DEFAULT_VALUES: RegisterFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_number: '',
  password: '',
  password_confirmation: '',
}

export default function RegisterScreen() {
  const { showToast } = useToast()

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: DEFAULT_VALUES,
  })

  const password = watch('password')
  const passwordConfirmation = watch('password_confirmation')
  const passwordsMatch = Boolean(password && passwordConfirmation && password === passwordConfirmation)

  const onSubmit = async (values: RegisterFormValues) => {
    const payload: SeekerRegisterPayload = {
      role: 'seeker',
      first_name: formatName(values.first_name),
      last_name: formatName(values.last_name),
      email: values.email.trim().toLowerCase(),
      mobile_number: normalizeMobileNumber(values.mobile_number),
      password: values.password,
      password_confirmation: values.password_confirmation,
    }

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
        const firstKey = Object.keys(serverErrors)[0]
        showToast((firstKey && serverErrors[firstKey]?.[0]) || response.data?.message || 'Please check your registration details.', 'error')
      } else if (!response) {
        const reason = err.code === 'ECONNABORTED' ? 'The request timed out.' : 'The backend could not be reached.'
        const detail = err.message ? ` ${err.message}` : ''
        showToast(
          `${reason} Make sure it is running at ${API_BASE_URL} and both devices use the same Wi-Fi.${detail}`
          , 'error')
      } else {
        showToast(response?.data?.message ?? 'Registration failed. Check your connection to the i-PESO backend.', 'error')
      }
    }
  }

  const onInvalid = () => showToast('Please complete the required registration fields.', 'error')

  return (
    <AuthShell
      title="Create your account"
      subtitle="Create your i-PESO job seeker account"
      onBack={() => router.back()}
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
          <Controller
            control={control}
            name="first_name"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <TextField
                label="First Name"
                value={value}
                onChangeText={(v) => {
                  onChange(v)
                }}
                onBlur={() => {
                  onChange(formatName(value))
                  onBlur()
                }}
                placeholder="Juan"
              />
            )}
          />
        </View>
        <View style={styles.nameHalf}>
          <Controller
            control={control}
            name="last_name"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <TextField
                label="Last Name"
                value={value}
                onChangeText={(v) => {
                  onChange(v)
                }}
                onBlur={() => {
                  onChange(formatName(value))
                  onBlur()
                }}
                placeholder="Dela Cruz"
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <TextField
            label="Email Address"
            value={value}
            // Mirrors i-peso-frontend's SeekerRegistration.jsx change() — lowercase and strip
            // whitespace live as the user types, not just on blur.
            onChangeText={(v) => {
              onChange(v.replace(/\s/g, '').toLowerCase())
            }}
            onBlur={onBlur}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
        )}
      />

      <Controller
        control={control}
        name="mobile_number"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <TextField
            label="Mobile Number"
            value={value}
            onChangeText={(v) => {
              onChange(normalizeMobileNumber(v))
            }}
            onBlur={onBlur}
            placeholder="09XXXXXXXXX"
            keyboardType="phone-pad"
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
            }}
            onBlur={onBlur}
            placeholder="Minimum 8 characters"
          />
        )}
      />
      <PasswordStrengthMeter password={password ?? ''} />

      <Controller
        control={control}
        name="password_confirmation"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <PasswordField
            label="Confirm Password"
            value={value}
            onChangeText={(v) => {
              onChange(v)
            }}
            onBlur={onBlur}
            placeholder="Re-enter your password"
          />
        )}
      />
      {passwordsMatch ? <Text style={styles.matchText}>Passwords match</Text> : null}

      <Button fullWidth onPress={handleSubmit(onSubmit, onInvalid)} loading={isSubmitting} style={styles.submit}>
        Create Account
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
  submit: {
    marginTop: spacing.md,
  },
})
