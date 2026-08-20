import type { ProgramEligibility } from '@/services/seekerService'
import { Badge } from '@/components/ui/Badge'

const MAP: Record<string, { variant: 'success' | 'warning' | 'neutral' | 'danger'; showScore: boolean }> = {
  highly_eligible: { variant: 'success', showScore: true },
  eligible: { variant: 'success', showScore: false },
  partially_eligible: { variant: 'warning', showScore: true },
  low_match: { variant: 'neutral', showScore: true },
  not_eligible: { variant: 'danger', showScore: false },
  unknown: { variant: 'neutral', showScore: false },
}

export function EligibilityBadge({ eligibility }: { eligibility?: ProgramEligibility | null }) {
  if (!eligibility) return null
  const conf = MAP[eligibility.status] ?? MAP.low_match
  const text =
    conf.showScore && typeof eligibility.score === 'number'
      ? `${eligibility.label} · ${eligibility.score}%`
      : eligibility.label
  return <Badge variant={conf.variant}>{text}</Badge>
}
