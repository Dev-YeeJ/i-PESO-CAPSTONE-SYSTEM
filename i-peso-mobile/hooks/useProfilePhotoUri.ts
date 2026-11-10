import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'
import { seekerService } from '@/services/seekerService'

/**
 * Local file URI of the signed-in seeker's 2x2 photo, or null (show initials instead).
 *
 * GET /api/seeker/profile-image is behind auth, and handing that URL straight to <Image> with a
 * `headers` prop fails silently: any non-image response (an expired token makes Laravel render
 * an HTML 500 page for non-JSON requests) just draws nothing — the empty avatar circle. So,
 * like the web portal (seekerService.getProfileImage → blob URL), the photo is downloaded with
 * the session token first, the status is checked, and <Image> only ever gets a local file.
 *
 * `cacheKey` must change whenever the photo may have changed (callers pass the profile id plus
 * an upload counter or the profile query's dataUpdatedAt), which also gives each version its
 * own file name so the native image cache can't show the previous photo.
 */
export function useProfilePhotoUri(hasPhoto: boolean, cacheKey: string): string | null {
  const { data } = useQuery({
    queryKey: ['profilePhotoFile', cacheKey],
    enabled: hasPhoto,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const token = await SecureStore.getItemAsync('ipeso_token')
      const target = `${FileSystem.cacheDirectory}profile-photo-${cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`
      const result = await FileSystem.downloadAsync(seekerService.profileImageUrl(cacheKey), target, {
        headers: {
          // Accept JSON too, so an auth failure comes back as a readable 401, not an HTML 500.
          Accept: 'image/*, application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const contentType = String(result.headers?.['Content-Type'] ?? result.headers?.['content-type'] ?? '')
      if (result.status >= 400 || !contentType.startsWith('image/')) {
        console.log(`⚠️ Profile photo download failed: HTTP ${result.status} (${contentType || 'no content type'})`)
        await FileSystem.deleteAsync(result.uri, { idempotent: true })
        throw new Error(`Profile photo unavailable (HTTP ${result.status}).`)
      }
      return result.uri
    },
  })

  return hasPhoto ? data ?? null : null
}
