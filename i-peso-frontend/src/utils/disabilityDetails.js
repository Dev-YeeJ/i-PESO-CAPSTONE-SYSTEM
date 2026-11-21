/**
 * Disability descriptions on the seeker's NSRP profile.
 *
 * The API keeps one row per disability type, each with its own
 * `disability_specification`: Others → what the disability is, Physical → the
 * seeker's short description. Read each from its own row, never "the first one
 * that has text", or the two get mixed up.
 */

/** The saved description for one disability type ('' when there is none). */
export const disabilityDetailFor = (rows, type) =>
  (rows ?? []).find((row) => row?.disability_type === type)?.disability_specification ?? ''

/**
 * Value for `physical_disability_details` in the step-1 payload. The website always
 * sends the key, because the API only requires a description from screens that send
 * it: the trimmed text while Physical is ticked, otherwise null.
 */
export const physicalDetailsPayload = (selected, text) =>
  (selected ?? []).includes('physical') ? String(text ?? '').trim() : null
