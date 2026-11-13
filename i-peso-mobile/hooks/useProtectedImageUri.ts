import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'

export const PROTECTED_IMAGE_KEY = ['protectedImageFile'] as const

/**
 * Local file URI for an image behind auth (job fair posters and the like).
 *
 * Handing a protected URL straight to <Image> with a `headers` prop fails silently on
 * device: any non-image answer just draws an empty box. Same fix as useProfilePhotoUri and
 * the website (api.get(..., { responseType: 'blob' })): download with the session token,
 * check the response really is an image, and give <Image> only the local file.
 *
 * `cacheKey` names the cached file and must be unique per image (e.g. `poster-12`).
 */
export function useProtectedImageUri(url: string | null, cacheKey: string) {
  const query = useQuery({
    queryKey: [...PROTECTED_IMAGE_KEY, url],
    enabled: Boolean(url),
    staleTime: 60 * 60 * 1000, // the backend sends Cache-Control: max-age=3600
    gcTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const token = await SecureStore.getItemAsync('ipeso_token')
      const target = `${FileSystem.cacheDirectory}${cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      const result = await FileSystem.downloadAsync(url!, target, {
        headers: {
          // Accept JSON too, so an auth failure comes back as a readable 401, not an HTML 500.
          Accept: 'image/*, application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const contentType = String(result.headers?.['Content-Type'] ?? result.headers?.['content-type'] ?? '')
      if (result.status >= 400 || !contentType.startsWith('image/')) {
        console.log(`⚠️ Image download failed: HTTP ${result.status} (${contentType || 'no content type'})`)
        await FileSystem.deleteAsync(result.uri, { idempotent: true })
        throw new Error(`Image unavailable (HTTP ${result.status}).`)
      }
      return result.uri
    },
  })

  return {
    uri: url ? query.data ?? null : null,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  }
}
