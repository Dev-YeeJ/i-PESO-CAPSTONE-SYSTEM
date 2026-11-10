import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getProfileImage } from '@/services/seekerService'

/**
 * Object URL for the signed-in seeker's 2x2 photo, or null (show initials instead).
 *
 * The photo lives behind the authenticated GET /api/seeker/profile-image, so a plain <img src>
 * can't load it — it's fetched as a blob. Driven by `has_profile_image` (from /auth/me and
 * login) and `profile_image_version` on the auth store user: SeekerProfile bumps the version
 * after an upload so the portal header swaps to the new photo without a page reload.
 */
export function useSeekerPhotoUrl() {
  const hasPhoto = useAuthStore((state) => Boolean(state.user?.has_profile_image))
  const version = useAuthStore((state) => state.user?.profile_image_version ?? 0)
  // Tagged with the version it was fetched for, so a stale photo is never shown while a
  // newer one loads, and "no photo" needs no state reset inside the effect.
  const [loaded, setLoaded] = useState({ url: null, version: null })

  useEffect(() => {
    if (!hasPhoto) return undefined

    let active = true
    let objectUrl
    getProfileImage()
      .then((file) => {
        objectUrl = URL.createObjectURL(file)
        if (active) setLoaded({ url: objectUrl, version })
      })
      .catch(() => {
        if (active) setLoaded({ url: null, version })
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [hasPhoto, version])

  return hasPhoto && loaded.version === version ? loaded.url : null
}
