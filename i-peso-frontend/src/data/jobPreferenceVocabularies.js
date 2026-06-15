const ISO_COUNTRY_CODES = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI',
  'CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE',
  'SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM',
  'JP','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX',
  'FM','MD','MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PA','PG','PY','PE','PL','PT','QA',
  'RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY',
  'TW','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW',
]

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

export const ISO_COUNTRIES = ISO_COUNTRY_CODES
  .map((code) => ({ code, name: countryNames.of(code) }))
  .filter((country) => country.name)
  .sort((a, b) => a.name.localeCompare(b.name))

export const TECHNICAL_SKILL_SUGGESTIONS = [
  'Accounting',
  'AutoCAD',
  'Automotive Repair',
  'Bookkeeping',
  'Carpentry',
  'Computer Hardware Troubleshooting',
  'Computer Literacy',
  'Cooking',
  'Customer Relationship Management',
  'Data Analysis',
  'Data Entry',
  'Digital Marketing',
  'Electrical Installation',
  'First Aid',
  'Forklift Operation',
  'Graphic Design',
  'Inventory Management',
  'Machine Operation',
  'Microsoft Excel',
  'Microsoft Office',
  'Mobile Phone Repair',
  'Payroll Processing',
  'Plumbing',
  'Point of Sale Systems',
  'Programming',
  'Project Management',
  'QuickBooks',
  'Social Media Management',
  'Web Development',
  'Welding',
]

export const SOFT_SKILL_SUGGESTIONS = [
  'Adaptability',
  'Attention to Detail',
  'Collaboration',
  'Communication',
  'Conflict Resolution',
  'Creativity',
  'Critical Thinking',
  'Customer Service',
  'Decision Making',
  'Dependability',
  'Emotional Intelligence',
  'Initiative',
  'Leadership',
  'Listening',
  'Negotiation',
  'Organization',
  'Problem Solving',
  'Professionalism',
  'Resilience',
  'Teamwork',
  'Time Management',
  'Work Ethic',
]
