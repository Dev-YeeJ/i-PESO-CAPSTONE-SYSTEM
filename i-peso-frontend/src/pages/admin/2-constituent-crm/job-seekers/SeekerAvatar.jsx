import { useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'

// The seeker's real 2x2 photo when one is on file, falling back to initials —
// mirrors ApplicantAvatar's pattern on the employer ATS grid.
export default function SeekerAvatar({ seekerId, hasPhoto, initials }) {
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    if (!hasPhoto || !seekerId) return undefined

    let active = true
    let objectUrl
    adminService.getSeekerProfileImage(seekerId)
      .then((file) => {
        objectUrl = URL.createObjectURL(file)
        if (active) setPhotoUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPhotoUrl(null)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [seekerId, hasPhoto])

  if (hasPhoto && photoUrl) {
    return <img src={photoUrl} alt={initials} className="h-11 w-11 shrink-0 rounded-full object-cover" />
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">
      {initials}
    </span>
  )
}
