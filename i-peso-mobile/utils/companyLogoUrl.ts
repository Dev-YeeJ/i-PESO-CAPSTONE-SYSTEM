import { API_BASE_URL } from '@/services/api'

/**
 * A company logo as the API stores it (a path on the public disk, e.g. "company_logos/x.png",
 * or already a full URL) turned into a URL the app can load. Mirrors
 * i-peso-frontend/src/utils/companyLogoUrl.js.
 */
export function companyLogoUrl(value: string | null | undefined, apiBaseUrl: string = API_BASE_URL): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value

  const baseUrl = (apiBaseUrl || '').replace(/\/api\/?$/i, '').replace(/\/+$/, '')
  const storedPath = value.replace(/^\/+/, '')
  const storagePath = storedPath.startsWith('storage/') ? storedPath : `storage/${storedPath}`

  return `${baseUrl}/${storagePath}`
}
