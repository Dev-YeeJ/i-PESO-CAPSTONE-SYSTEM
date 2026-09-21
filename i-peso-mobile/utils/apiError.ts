import type { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

export function apiErrorMessage(caught: unknown, fallback: string) {
  const err = caught as AxiosError<ApiErrorBody>
  const status = err.response?.status
  const body = err.response?.data
  const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
  // A 4xx body.message is an intentional, user-facing message from the controller
  // (e.g. "This application can no longer be withdrawn."). A 5xx body.message is
  // Laravel's generic production error body ("Server Error") — never something
  // worth showing verbatim — so always prefer the caller's friendly fallback there.
  const serverMessage = status != null && status >= 500 ? '' : body?.message
  return firstError || serverMessage || fallback
}
