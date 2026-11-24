// Waiting for feedback first (what the employer can act on now), then hires whose
// start date hasn't come yet, then the ones already rated. Stable within each group.
const rank = (hire) => {
  if (hire.feedback) return 2
  return hire.can_give_feedback ? 0 : 1
}

export function sortHires(hires = []) {
  return hires
    .map((hire, index) => ({ hire, index }))
    .sort((a, b) => rank(a.hire) - rank(b.hire) || a.index - b.index)
    .map(({ hire }) => hire)
}
