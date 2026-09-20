import { z } from 'zod'

// Mirrors AuthController::register — regex:/^[\pL\s.'-]+$/u, min:2, max:100
const NAME_PATTERN = /^[\p{L}\s.'-]{2,100}$/u

// Mirrors Password::min(8)->numbers()->symbols() (vendor/laravel/framework
// .../Validation/Rules/Password.php) — numbers: \pN, symbols: \p{Z}|\p{S}|\p{P}
const HAS_NUMBER = /\p{N}/u
const HAS_SYMBOL = /\p{Z}|\p{S}|\p{P}/u

// Mirrors i-peso-frontend's email regex exactly (stricter than login's bare \S+@\S+\.\S+ —
// intentionally different per screen, ported as-is rather than unified, so neither screen's
// validation behavior changes).
const REGISTER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LOGIN_EMAIL_PATTERN = /\S+@\S+\.\S+/

const MOBILE_PATTERN = /^09\d{9}$/

/**
 * Every field below uses `superRefine` with an if/else instead of chained `.min().regex()`
 * checks — that preserves this app's existing "one message at a time, required beats
 * invalid-format" behavior exactly. Zod's default chaining reports every failing check at
 * once, which would silently change what error text a seeker sees for the same bad input.
 */
export const loginSchema = z.object({
  email: z.string().superRefine((value, ctx) => {
    const trimmed = value.trim()
    if (!trimmed) {
      ctx.addIssue({ code: 'custom', message: 'Email is required.' })
    } else if (!LOGIN_EMAIL_PATTERN.test(trimmed)) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid email.' })
    }
  }),
  password: z.string().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: 'custom', message: 'Password is required.' })
    } else if (value.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'Minimum 8 characters.' })
    }
  }),
})

export type LoginFormValues = z.infer<typeof loginSchema>

const nameField = (label: string) =>
  z.string().superRefine((value, ctx) => {
    const trimmed = value.trim()
    if (!trimmed) {
      ctx.addIssue({ code: 'custom', message: `${label} is required.` })
    } else if (!NAME_PATTERN.test(trimmed)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use letters, spaces, periods, apostrophes, or hyphens only (2-100 characters).',
      })
    }
  })

export const registerSchema = z
  .object({
    first_name: nameField('First name'),
    last_name: nameField('Last name'),
    email: z.string().superRefine((value, ctx) => {
      const trimmed = value.trim()
      if (!trimmed) {
        ctx.addIssue({ code: 'custom', message: 'Email is required.' })
      } else if (!REGISTER_EMAIL_PATTERN.test(trimmed)) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid email address.' })
      }
    }),
    mobile_number: z.string().superRefine((value, ctx) => {
      const trimmed = value.trim()
      if (!trimmed) {
        ctx.addIssue({ code: 'custom', message: 'Mobile number is required.' })
      } else if (!MOBILE_PATTERN.test(trimmed)) {
        ctx.addIssue({ code: 'custom', message: 'Use a valid PH mobile number, e.g. 09XXXXXXXXX.' })
      }
    }),
    password: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: 'Password is required.' })
      } else if (value.length < 8) {
        ctx.addIssue({ code: 'custom', message: 'Minimum 8 characters.' })
      } else if (!HAS_NUMBER.test(value) || !HAS_SYMBOL.test(value)) {
        ctx.addIssue({ code: 'custom', message: 'Password must include at least one number and one symbol.' })
      }
    }),
    password_confirmation: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.password_confirmation) {
      ctx.addIssue({ code: 'custom', message: 'Please confirm password.', path: ['password_confirmation'] })
    } else if (data.password !== data.password_confirmation) {
      ctx.addIssue({ code: 'custom', message: 'Passwords do not match.', path: ['password_confirmation'] })
    }
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
