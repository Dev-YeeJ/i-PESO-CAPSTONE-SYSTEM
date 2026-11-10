// What makes a company profile complete enough for job seekers to trust it.
// Each item says where to fix it: `field` opens the edit panel on that field,
// `action: 'logo'` opens the logo upload.

export const MIN_DESCRIPTION = 80

export const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro', detail: '1–9 employees' },
  { value: 'small', label: 'Small', detail: '10–99 employees' },
  { value: 'medium', label: 'Medium', detail: '100–199 employees' },
  { value: 'large', label: 'Large', detail: '200+ employees' },
]

export const sizeLabel = (value) => {
  const size = COMPANY_SIZES.find((option) => option.value === value)
  return size ? `${size.label} · ${size.detail}` : null
}

export const industriesOf = (profile) =>
  (Array.isArray(profile?.industry) ? profile.industry : [profile?.industry]).filter(Boolean)

const filled = (value) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value)

export function profileStrength(profile) {
  const items = [
    { key: 'logo', label: 'Company logo', hint: 'Shown on every job post and on the Smart Job Map.', done: filled(profile?.company_logo_url), action: 'logo' },
    {
      key: 'about',
      label: 'About the company',
      hint: `A few sentences (at least ${MIN_DESCRIPTION} characters) on what you do and what it's like to work there.`,
      done: (profile?.company_description ?? '').trim().length >= MIN_DESCRIPTION,
      field: 'company_description',
    },
    { key: 'industry', label: 'Industry', hint: 'Helps job seekers find you by field.', done: industriesOf(profile).length > 0, field: 'industry' },
    { key: 'size', label: 'Company size', hint: 'Lets applicants know what to expect.', done: filled(profile?.company_size), field: 'company_size' },
    {
      key: 'representative',
      label: 'Representative',
      hint: 'The person applicants and PESO deal with.',
      done: filled(profile?.representative_name) && filled(profile?.representative_designation),
      field: 'representative_name',
    },
    { key: 'mobile', label: 'Mobile number', hint: 'For PESO and interview follow-ups.', done: filled(profile?.mobile_number), field: 'mobile_number' },
  ]

  const done = items.filter((item) => item.done).length

  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) }
}
