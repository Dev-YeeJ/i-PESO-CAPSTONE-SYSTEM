export function companyLogoUrl(value, apiBaseUrl = import.meta.env.VITE_API_BASE_URL) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value

  const baseUrl = (apiBaseUrl || 'http://localhost:8000/api').replace(/\/api\/?$/i, '')
  const storedPath = value.replace(/^\/+/, '')
  const storagePath = storedPath.startsWith('storage/')
    ? `/${storedPath}`
    : `/storage/${storedPath}`

  return new URL(storagePath, baseUrl).toString()
}
