// Exact port of i-peso-frontend's SeekerProfile.jsx experience-responsibilities
// helpers. Per the team's decision on MOBILE_PARITY_12: "AI Enhance Bullets" is
// NOT real AI on web either — enhanceResponsibilities() there is a hardcoded
// two-branch template. Mobile mirrors that exact logic rather than calling a
// real model, so the same labeled feature produces identical output on both
// platforms. Do not "improve" this into a real AI call without a joint
// decision to change web too.

/** Mirrors enhanceResponsibilities()'s ternary exactly — same input, same output as web. */
export function enhanceResponsibilities(draft: string | undefined, position: string | undefined): string {
  const trimmed = draft?.trim()
  return trimmed?.toLowerCase().includes('encoded data')
    ? '- Accurately encoded and managed large datasets, ensuring 100% data integrity and operational efficiency.'
    : `- Delivered ${position || 'assigned'} responsibilities with accuracy, consistency, and attention to operational standards.`
}

/** Mirrors experienceKey() — a stable per-entry key for entries that may not have a saved id yet. */
export function experienceKey(experience: Record<string, unknown>, index: number): string {
  const id = experience.id ?? experience.work_experience_id
  if (id !== undefined && id !== null) return String(id)
  return `${experience.company_name}-${experience.position}-${index}`
}

/** Mirrors responsibilityLines() — splits saved bullet text back into individual lines for display. */
export function responsibilityLines(value: string | undefined): string[] {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

/** Mirrors resumeResponsibilityPayload() — builds the {experienceId: bulletText} override map sent with resume generation. */
export function resumeResponsibilityPayload(
  experiences: Record<string, unknown>[],
  responsibilities: Record<string, string>
): Record<string, string> {
  const entries = experiences
    .map((experience, index) => {
      const key = experienceKey(experience, index)
      const id = experience.id ?? experience.work_experience_id
      const payloadKey = id !== undefined && id !== null ? String(id) : key
      const value = responsibilities[key] ?? (experience.responsibilities as string | undefined) ?? ''
      return [payloadKey, value] as const
    })
    .filter(([, value]) => value.trim())

  return Object.fromEntries(entries)
}
