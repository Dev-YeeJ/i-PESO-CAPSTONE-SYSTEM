import type { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

export function apiErrorMessage(caught: unknown, fallback: string) {
  const err = caught as AxiosError<ApiErrorBody>
  const body = err.response?.data
  const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
  return firstError || body?.message || fallback
}
