import { useQuery } from '@tanstack/react-query'
import { getPlacementComplianceGrid } from '@/services/placementReportService'

/** States where the employer has handed something in that PESO accepted or is reviewing. */
export const SETTLED_STATES = new Set(['approved', 'pending_review', 'nil'])

export const complianceGridKey = (year) => ['admin', 'placementComplianceGrid', year]

/** Shared by the grid and the page's summary cards; React Query dedupes the request. */
export function usePlacementComplianceGrid(year) {
  return useQuery({
    queryKey: complianceGridKey(year),
    queryFn: () => getPlacementComplianceGrid(year),
    staleTime: 60_000,
  })
}

/**
 * On-time rate across every employer-month whose deadline has passed:
 * submitted (or declared nil) on or before the deadline, over all that were required.
 */
export function summarizeCompliance(grid) {
  let required = 0
  let onTime = 0
  let overdue = 0
  for (const row of grid?.rows ?? []) {
    for (const cell of row.cells) {
      if (cell.state === 'not_required' || cell.state === 'due') continue
      required += 1
      if (SETTLED_STATES.has(cell.state) && !cell.late) onTime += 1
      if (cell.state === 'overdue') overdue += 1
    }
  }
  return { required, onTime, overdue, rate: required ? Math.round((onTime / required) * 100) : null }
}
