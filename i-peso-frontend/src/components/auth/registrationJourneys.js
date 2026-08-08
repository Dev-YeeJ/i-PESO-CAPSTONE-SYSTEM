// Registration journey definitions.
//
// `ready` is the list surfaced in the rail's "Have this ready" panel. A long
// government form is abandoned at the moment someone discovers they need a
// document that is not in front of them — so each step says what it will ask
// for before it asks. Keep these in the seeker's own words, not field names.

export const employerRegistrationSteps = [
  {
    label: 'Account Setup',
    shortLabel: 'Account',
    ready: ['A company email address you can open now', 'A password you have not used elsewhere'],
  },
  {
    label: 'Email Verification',
    shortLabel: 'Verification',
    ready: ['The 6-digit code we just emailed you'],
  },
  {
    label: 'Company Profile',
    shortLabel: 'Company',
    ready: ['Your registered business name', 'Office address and contact number', 'Industry and company size'],
  },
  {
    label: 'Legal Documents',
    shortLabel: 'Documents',
    ready: ['SEC, DTI or CDA registration', 'Mayor’s or business permit', 'BIR Certificate of Registration'],
  },
  {
    label: 'Representative',
    shortLabel: 'Representative',
    ready: ['Full name and position of your authorised representative', 'A valid company ID'],
  },
]

export const seekerRegistrationSteps = [
  {
    label: 'Account Setup',
    shortLabel: 'Account',
    ready: ['An email address you can open now', 'Your mobile number'],
  },
  {
    label: 'Email Verification',
    shortLabel: 'Verification',
    ready: ['The 6-digit code we just emailed you'],
  },
  {
    label: 'Personal Information',
    shortLabel: 'Personal',
    ready: ['Your date of birth', 'Your complete home address', 'TIN, if you have one — optional'],
  },
  {
    label: 'Employment Status',
    shortLabel: 'Employment',
    ready: ['Whether you are working now', 'How long you have been looking for work'],
  },
  {
    label: 'Job Preference',
    shortLabel: 'Preference',
    ready: ['The kind of work you want', 'Where you are willing to work'],
  },
  {
    label: 'Language Skills',
    shortLabel: 'Language',
    ready: ['Languages you read, write, speak or understand'],
  },
  {
    label: 'Education & Skills',
    shortLabel: 'Education',
    ready: ['Your highest level of schooling', 'School name and years attended', 'Your diploma or transcript, to check dates'],
  },
  {
    label: 'Training & Eligibility',
    shortLabel: 'Training',
    ready: ['TESDA or other training certificates', 'Civil service or PRC licence details, if any'],
  },
  {
    label: 'Work Experience',
    shortLabel: 'Experience',
    ready: ['Past employers and your position', 'Month and year you started and left'],
  },
]

export const registrationJourneyCopy = {
  employer: {
    eyebrow: 'For Employers',
    heading: 'Connect with qualified local job seekers',
    description: 'Build a trusted company profile, submit PESO requirements, and publish opportunities after verification.',
    portal: 'Employer Registration',
  },
  seeker: {
    eyebrow: 'For Job Seekers',
    heading: 'Build your path to local employment',
    description: 'Create your account, complete your DOLE NSRP profile, and become ready for skills-based job matching.',
    portal: 'Job Seeker Registration',
  },
}
