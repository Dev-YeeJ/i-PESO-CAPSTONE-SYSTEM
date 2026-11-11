// Shared by the Report & Safety screens (job seekers reporting employers).
// Mirrors i-peso-frontend's services/safetyReportService.js (safetyStatusBadge) and the
// file checks in components/safety/ReportConcernDialog.jsx (addFiles).
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import type { EvidenceFile, SafetyReportOptions, SafetyReportStatus } from '@/services/seekerService'

export const SAFETY_OPTIONS_KEY = ['safetyReportOptions', 'seeker'] as const
export const MY_SAFETY_REPORTS_KEY = ['mySafetyReports', 'seeker'] as const
export const mySafetyReportKey = (id: number | string) => ['mySafetyReport', 'seeker', String(id)] as const

/** Used until the options endpoint answers — the same fallback the website uses. */
export const DEFAULT_SAFETY_LIMITS: SafetyReportOptions['limits'] = {
  description_min: 30,
  description_max: 3000,
  max_attachments: 5,
  max_attachment_kb: 5120,
  attachment_types: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
}

/**
 * Status → the app's Badge variants. The website maps submitted→pending, under_review→review,
 * action_required→warning, resolved→verified, dismissed→neutral; these are the closest
 * variants the app has.
 */
export function safetyStatusBadge(status: SafetyReportStatus | string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'submitted': return 'warning'
    case 'under_review': return 'info'
    case 'action_required': return 'warning'
    case 'resolved': return 'success'
    default: return 'neutral'
  }
}

export const formatFileSize = (bytes = 0) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** "Nov 12, 2026" from an ISO string or YYYY-MM-DD, read as a local date. */
export function formatSafetyDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-PH', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

const IMAGE_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Opens the photo library or the document picker and returns the picked file, or null.
 * Throws a readable Error if photo permission is refused.
 */
export async function pickEvidence(kind: 'photo' | 'pdf'): Promise<EvidenceFile | null> {
  if (kind === 'pdf') {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.length) return null
    const asset = result.assets[0]
    return { uri: asset.uri, name: asset.name || `document-${Date.now()}.pdf`, type: asset.mimeType || 'application/pdf', size: asset.size }
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new Error('Photo library permission is required to attach a photo.')
  // quality < 1 makes iOS hand back a JPEG instead of HEIC, which the API would refuse.
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
  if (result.canceled || !result.assets?.length) return null
  const asset = result.assets[0]
  const type = asset.mimeType || 'image/jpeg'
  const extension = IMAGE_EXTENSIONS[type] ?? 'jpg'
  const hasExtension = /\.[a-z0-9]+$/i.test(asset.fileName ?? '')
  return {
    uri: asset.uri,
    name: asset.fileName && hasExtension ? asset.fileName : `photo-${Date.now()}.${extension}`,
    type,
    size: asset.fileSize,
  }
}

/**
 * Adds a picked file to the list if it passes the same checks (and messages) as the website's
 * addFiles: allowed type, size limit, file count. `capacity` is how many files are allowed in
 * total for this list (fewer when adding to a case that already has some).
 */
export function addEvidence(
  current: EvidenceFile[],
  file: EvidenceFile,
  limits: SafetyReportOptions['limits'],
  capacity = limits.max_attachments,
): { files: EvidenceFile[]; problem: string | null } {
  const allowed = limits.attachment_types
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!allowed.includes(extension)) {
    return { files: current, problem: `${file.name}: only ${allowed.join(', ').toUpperCase()} files are accepted.` }
  }
  if ((file.size ?? 0) > limits.max_attachment_kb * 1024) {
    return { files: current, problem: `${file.name} is larger than ${Math.round(limits.max_attachment_kb / 1024)} MB.` }
  }
  if (current.length >= capacity) {
    return { files: current, problem: `You can attach up to ${capacity} files.` }
  }
  return { files: [...current, file], problem: null }
}
