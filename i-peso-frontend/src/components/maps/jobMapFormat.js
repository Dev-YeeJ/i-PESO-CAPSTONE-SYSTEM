// Shared by the job map's cards and results summary.

/** "0.0 km" reads like a bug; anything under 100 m is "under 0.1 km". */
export const formatKm = (km) => (Number(km) < 0.1 ? 'under 0.1 km' : `${Number(km).toFixed(1)} km`)

/** The seeker's application, as a chip: still in play in green, closed ones in grey. */
const APPLICATION_CHIPS = {
  pending: { label: 'Applied', tone: 'bg-emerald-50 text-emerald-700', icon: true },
  reviewed: { label: 'Applied · Reviewed', tone: 'bg-emerald-50 text-emerald-700', icon: true },
  shortlisted: { label: 'Shortlisted', tone: 'bg-emerald-50 text-emerald-700', icon: true },
  interview: { label: 'Interview', tone: 'bg-amber-50 text-amber-800', icon: true },
  hired: { label: 'Hired', tone: 'bg-emerald-100 text-emerald-800', icon: true },
  rejected: { label: 'Not selected', tone: 'bg-slate-100 text-slate-600', icon: false },
  withdrawn: { label: 'Withdrawn', tone: 'bg-slate-100 text-slate-600', icon: false },
}
export const applicationChip = (status) => APPLICATION_CHIPS[status] ?? APPLICATION_CHIPS.pending
