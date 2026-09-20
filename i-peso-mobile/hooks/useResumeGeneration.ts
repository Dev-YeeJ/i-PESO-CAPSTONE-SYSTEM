import { useEffect, useRef, useState } from 'react'
import type { SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { postAndDownload } from '@/utils/fileTransfer'
import { apiErrorMessage } from '@/utils/apiError'
import { resumeResponsibilityPayload } from '@/utils/resumeBullets'
import { hasResumeSourceData } from '@/utils/resumePreview'

/**
 * The one resume-generation flow shared by the Profile screen's quick "Generate resume"
 * modal and the dedicated Resume Studio screen — extracted so both call the exact same
 * summary state, AI-assist call, and postAndDownload() request instead of each screen
 * growing its own copy (which is exactly how two screens quietly drift out of sync).
 */
export function useResumeGeneration(
  profile: SeekerProfile | undefined,
  workExperiences: Record<string, unknown>[],
  allSkills: string[],
  experienceResponsibilities: Record<string, string> = {}
) {
  const [summary, setSummary] = useState('')
  const [resumeBusy, setResumeBusy] = useState(false)
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false)
  const [aiSummaryNotice, setAiSummaryNotice] = useState('')
  const [actionError, setActionError] = useState('')
  // Seeds the draft from the saved summary exactly once per profile load — after that the
  // user's in-progress edits must win, even across a background refetch triggered by
  // pull-to-refresh elsewhere in the app.
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (profile?.professional_summary) {
      setSummary(profile.professional_summary)
      seededRef.current = true
    }
  }, [profile?.professional_summary])

  const generateSummaryWithAI = async () => {
    setAiSummaryBusy(true)
    setAiSummaryNotice('')
    const result = await seekerService.generateProfessionalSummaryAI(summary.trim() || undefined)
    if (result?.summary) {
      setSummary(result.summary)
      // Persist immediately — generateProfessionalSummaryAI only *drafts*
      // text, it doesn't save it, and resume generation below only reads
      // professional_summary as a fallback rather than writing it back
      // (confirmed in SeekerResumeController::generate()). Without this,
      // an AI-drafted summary the seeker never turns into a PDF this
      // session would just vanish. Best-effort — a save hiccup shouldn't
      // block using the freshly drafted text right now.
      seekerService.saveProfessionalSummary(result.summary).catch(() => {})
    } else {
      setAiSummaryNotice('Smart summary generation is unavailable right now. You can still write your own summary.')
    }
    setAiSummaryBusy(false)
  }

  const canGenerate = Boolean(profile?.has_profile_image) && (Boolean(summary.trim()) || hasResumeSourceData(profile, allSkills))

  const generateResume = async (onSuccess?: () => void) => {
    // Belt-and-suspenders against a double-fire: callers already pass disabled={resumeBusy},
    // but this makes it impossible even if two taps land in the same event-loop tick —
    // resume generation is server-throttled to 5/minute (routes/api.php).
    if (resumeBusy) return
    if (!profile?.has_profile_image) {
      setActionError('Upload a professional 2x2 photo before generating your resume.')
      return
    }
    if (!summary.trim() && !hasResumeSourceData(profile, allSkills)) {
      setActionError('Add a short professional summary before generating your resume.')
      return
    }
    setResumeBusy(true)
    setActionError('')
    try {
      await postAndDownload(
        '/seeker/resume/generate',
        {
          professional_summary: summary.trim() || null,
          responsibility_overrides: resumeResponsibilityPayload(workExperiences, experienceResponsibilities),
        },
        `iPESO_Resume_${profile?.last_name || 'seeker'}.pdf`
      )
      // The summary just baked into that PDF is also worth keeping on the
      // profile record itself — best-effort, a save hiccup here shouldn't
      // undo a resume the seeker already successfully downloaded.
      if (summary.trim()) {
        seekerService.saveProfessionalSummary(summary.trim()).catch(() => {})
      }
      onSuccess?.()
    } catch (caught) {
      // The 429 the backend's `throttle:5,1` returns has no JSON body (just an empty array),
      // so apiErrorMessage's fallback used to claim a connection problem — misdiagnosing a
      // rate limit as a network/backend outage.
      const status = (caught as { response?: { status?: number } })?.response?.status
      setActionError(
        status === 429
          ? "You're generating resumes too quickly. Please wait a minute and try again."
          : apiErrorMessage(caught, 'Unable to generate resume. Check your backend connection.')
      )
    } finally {
      setResumeBusy(false)
    }
  }

  return {
    summary,
    setSummary,
    resumeBusy,
    aiSummaryBusy,
    aiSummaryNotice,
    actionError,
    setActionError,
    canGenerate,
    generateSummaryWithAI,
    generateResume,
  }
}
