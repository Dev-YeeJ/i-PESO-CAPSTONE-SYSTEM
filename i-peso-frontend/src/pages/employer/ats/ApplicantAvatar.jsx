import { useEffect, useState } from 'react'
import { getApplicantProfileImage } from '@/services/employerApplicationService'
import { getInitials } from './atsFormatters'

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-xs',
  lg: 'h-16 w-16 text-lg',
}

// The applicant's real photo when they have one on file, falling back to an
// initials circle otherwise — mirrors the seeker-side has_profile_image gate
// (SeekerProfile.jsx) so this never fires a request for a seeker with no photo.
export default function ApplicantAvatar({ applicationId, hasPhoto, name, size = 'sm' }) {
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    if (!hasPhoto || !applicationId) return undefined

    let active = true
    let objectUrl
    getApplicantProfileImage(applicationId)
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
  }, [applicationId, hasPhoto])

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm

  if (hasPhoto && photoUrl) {
    return <img src={photoUrl} alt={name || 'Applicant'} className={`${sizeClass} shrink-0 rounded-full object-cover shadow-sm`} />
  }

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-sm`}>
      {getInitials(name)}
    </div>
  )
}
