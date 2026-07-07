export const MONTH_DURATION_OPTIONS = [
  { value: 0, label: 'Less than 1 month' }, { value: 1, label: '1 month' },
  { value: 2, label: '2 months' }, { value: 3, label: '3 months' },
  { value: 4, label: '4 months' }, { value: 5, label: '5 months' },
  { value: 6, label: '6 months' }, { value: 9, label: '9 months' },
  { value: 12, label: '1 year' }, { value: 18, label: '1 year 6 months' },
  { value: 24, label: '2 years' }, { value: 36, label: '3 years' },
  { value: 48, label: '4 years' }, { value: 60, label: '5 years' },
  { value: 84, label: '7 years' }, { value: 120, label: '10 years' },
  { value: 180, label: '15 years' }, { value: 240, label: '20 years' },
  { value: 300, label: '25 years or more' },
]

export const TRAINING_HOUR_OPTIONS = [8, 16, 24, 40, 80, 120, 160, 240, 320, 480, 960]
  .map((value) => ({ value, label: `${value} hours` }))

export const TRAINING_COURSE_OPTIONS = [
  'Automotive Servicing NC II', 'Barista NC II', 'Bookkeeping NC III',
  'Bread and Pastry Production NC II', 'Caregiving NC II', 'Computer Systems Servicing NC II',
  'Contact Center Services NC II', 'Cookery NC II', 'Driving NC II',
  'Electrical Installation and Maintenance NC II', 'Food and Beverage Services NC II',
  'Front Office Services NC II', 'Housekeeping NC II', 'Masonry NC II',
  'Shielded Metal Arc Welding NC II', 'Technical Drafting NC II', 'Trainers Methodology I',
  'Visual Graphic Design NC III',
]

export const TRAINING_INSTITUTION_OPTIONS = [
  'Department of Labor and Employment', 'Local Government Unit',
  'Public Employment Service Office', 'TESDA', 'TESDA Accredited Training Center',
  'TESDA Provincial Training Center', 'Technical Vocational Institution',
]

export const ELIGIBILITY_NAME_OPTIONS = [
  'Board Passer / Professional License', 'Career Service Professional Eligibility',
  'Career Service Subprofessional Eligibility', 'Civil Service Eligibility',
  'Criminologist Licensure Examination', 'Driver License',
  'Licensure Examination for Teachers', 'Nursing Licensure Examination',
  'Professional Teacher License',
]

export const COMPANY_SUGGESTIONS = [
  ['Department of Labor and Employment', 'Government agency'],
  ['Jollibee Foods Corporation', 'Food service and restaurant'],
  ['SM Supermalls', 'Retail and mall operations'],
  ['SM Hypermarket', 'Retail and grocery'],
  ['Mang Inasal', 'Food service and restaurant'],
  ["McDonald's Philippines", 'Food service and restaurant'],
  ['7-Eleven Philippines', 'Convenience store'],
  ['Accenture', 'BPO, technology, and consulting'],
  ['Concentrix', 'BPO and customer service'],
  ['Teleperformance', 'BPO and customer service'],
  ['Foundever', 'BPO and customer service'],
  ['Urdaneta City Government', 'Local government'],
  ['Local Government Unit', 'Government office'],
  ['Public Employment Service Office', 'PESO office'],
  ['Department of Education', 'Education agency'],
  ['TESDA', 'Technical education and training'],
  ['Barangay Office', 'Community government office'],
  ['Municipal Hall', 'Local government office'],
  ['City Hall', 'Local government office'],
  ['Robinsons', 'Retail and mall operations'],
  ['Puregold', 'Retail and grocery'],
  ['Watsons', 'Retail pharmacy and health store'],
  ['Mercury Drug', 'Pharmacy and retail'],
  ['Wilcon Depot', 'Hardware and construction retail'],
  ['Small Business / Self-Employed', 'Self-employment or family business'],
].map(([label, meta]) => ({ label, meta, keywords: `${label} ${meta}` }))
