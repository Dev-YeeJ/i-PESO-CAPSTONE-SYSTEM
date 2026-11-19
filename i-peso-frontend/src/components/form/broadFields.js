/** Broad i-PESO job families that anchor occupation matching. */
export const BROAD_FIELD_OPTIONS = [
  { key: 'office-work', label: 'Office and Administration', anchorCode: 'general:office-work', psocCode: '41' },
  { key: 'factory-worker', label: 'Manufacturing and Factory Work', anchorCode: 'general:factory-worker', psocCode: '81' },
  { key: 'driver', label: 'Driving and Transportation', anchorCode: 'general:driver', psocCode: '83' },
  { key: 'delivery-work', label: 'Delivery and Courier Work', anchorCode: 'general:delivery-work', psocCode: '83' },
  { key: 'healthcare-work', label: 'Healthcare', anchorCode: 'general:healthcare-work', psocCode: '22' },
  { key: 'caregiver-work', label: 'Caregiving and Personal Care', anchorCode: 'general:caregiver-work', psocCode: '53' },
  { key: 'construction-work', label: 'Construction', anchorCode: 'general:construction-work', psocCode: '93' },
  { key: 'skilled-trades', label: 'Skilled Trades and Repair', anchorCode: 'general:skilled-trades', psocCode: '72' },
  { key: 'hospitality-work', label: 'Hospitality and Hotels', anchorCode: 'general:hospitality-work', psocCode: '51' },
  { key: 'restaurant-work', label: 'Food Service and Restaurants', anchorCode: 'general:restaurant-work', psocCode: '51' },
  { key: 'retail-work', label: 'Retail and Store Work', anchorCode: 'general:retail-work', psocCode: '52' },
  { key: 'agriculture-work', label: 'Agriculture and Farming', anchorCode: 'general:agriculture-work', psocCode: '61' },
  { key: 'fishing-work', label: 'Fishing and Fish Processing', anchorCode: 'general:fishing-work', psocCode: '62' },
  { key: 'it-work', label: 'IT and Computer Work', anchorCode: 'general:it-work', psocCode: '25' },
  { key: 'education-work', label: 'Education and Teaching', anchorCode: 'general:education-work', psocCode: '23' },
  { key: 'logistics-work', label: 'Warehouse and Logistics', anchorCode: 'general:logistics-work', psocCode: '43' },
  { key: 'beauty-work', label: 'Beauty and Wellness', anchorCode: 'general:beauty-work', psocCode: '51' },
  { key: 'household-work', label: 'Household and Domestic Services', anchorCode: 'general:household-work', psocCode: '91' },
  { key: 'government-work', label: 'Government and Community Services', anchorCode: 'general:government-work', psocCode: '33' },
  { key: 'bpo-work', label: 'BPO and Customer Service', anchorCode: 'general:bpo-work', psocCode: '42' },
  { key: 'online-work', label: 'Online and Digital Work', anchorCode: 'general:online-work', psocCode: '25' },
  { key: 'finance-work', label: 'Accounting and Finance', anchorCode: 'general:finance-work', psocCode: '24' },
  { key: 'engineering-work', label: 'Engineering and Architecture', anchorCode: 'general:engineering-work', psocCode: '21' },
  { key: 'security-work', label: 'Security and Protective Services', anchorCode: 'general:security-work', psocCode: '54' },
  { key: 'human-resources-work', label: 'Human Resources and Recruitment', anchorCode: 'general:human-resources-work', psocCode: '24' },
  { key: 'legal-work', label: 'Legal and Compliance', anchorCode: 'general:legal-work', psocCode: '26' },
  { key: 'marketing-work', label: 'Marketing and Communications', anchorCode: 'general:marketing-work', psocCode: '24' },
  { key: 'creative-work', label: 'Media Arts and Design', anchorCode: 'general:creative-work', psocCode: '26' },
  { key: 'banking-work', label: 'Banking and Insurance', anchorCode: 'general:banking-work', psocCode: '33' },
  { key: 'real-estate-work', label: 'Real Estate and Property Services', anchorCode: 'general:real-estate-work', psocCode: '33' },
  { key: 'science-work', label: 'Science, Research and Laboratory Work', anchorCode: 'general:science-work', psocCode: '21' },
  { key: 'utilities-work', label: 'Utilities, Energy and Environment', anchorCode: 'general:utilities-work', psocCode: '31' },
  { key: 'tourism-work', label: 'Tourism, Events and Recreation', anchorCode: 'general:tourism-work', psocCode: '51' },
  { key: 'social-services-work', label: 'Social Services and Counseling', anchorCode: 'general:social-services-work', psocCode: '26' },
  { key: 'management-work', label: 'Management and Business Operations', anchorCode: 'general:management-work', psocCode: '12' },
]

/**
 * Rebuild the occupation-mapper value from a saved vacancy (used when
 * duplicating a posting), so the mapper shows the field instead of a blank.
 */
export function mappingFromVacancy(vacancy) {
  const stored = String(vacancy?.broad_field_key || vacancy?.anchor_code || vacancy?.general_term || '')
    .toLowerCase().replace(/^general:/, '').replace(/[\s_]+/g, '-')
  const field = BROAD_FIELD_OPTIONS.find((option) => option.key === stored)
  if (!field) return null
  return {
    displayTitle: vacancy.job_title ?? '',
    psocCode: field.psocCode,
    anchorCode: field.anchorCode,
    broadField: field.label,
    broadFieldKey: field.key,
    fieldName: field.label,
    matchLevel: 'broad',
  }
}
