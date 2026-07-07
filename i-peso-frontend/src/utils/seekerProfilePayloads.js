export function serializeOccupationPreferences(occupations = []) {
  return occupations.slice(0, 3).map((occupation) => {
    const occupationId = occupation.occupation_id || null

    return {
      occupation_id: occupationId,
      general_term: occupationId ? null : (occupation.general_term || null),
      broad_field: occupationId ? null : (occupation.broad_field || null),
      role_function: occupationId ? null : (occupation.role_function || null),
      confidence: occupationId ? null : (occupation.confidence || null),
      raw_job_title: occupationId ? null : (occupation.raw_job_title || occupation.occupation_title || null),
      source: occupationId ? null : (occupation.source || null),
    }
  })
}
