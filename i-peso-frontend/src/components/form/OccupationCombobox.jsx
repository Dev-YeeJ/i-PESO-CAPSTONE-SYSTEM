import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { classifyOccupation, searchOccupations } from '@/services/occupationService'

// ─── Module-level in-memory cache ─────────────────────────────────────────────
const queryCache = new Map()
const CACHE_MAX = 40

function putCache(key, value) {
  if (queryCache.size >= CACHE_MAX) {
    queryCache.delete(queryCache.keys().next().value)
  }
  queryCache.set(key, value)
}

// ─── Instant client-side dictionary (classify mode only) ──────────────────────
// Mirrors LocalJobTermDictionary.php — provides zero-latency results before the server responds.
// Trigger matching: q.includes(trigger) OR trigger.startsWith(q) (for partial typing).
// All triggers must be ≥3 chars to avoid false positives.
const INSTANT_DICT = [
  // ── Office & Administration ─────────────────────────────────────────────────
  { t: ['office staff', 'office work', 'admin staff', 'admin work', 'opisina', 'administrative work', 'admin assistant', 'administrative assistant', 'admin aide', 'clerical', 'clerical work'], title: 'Office Clerk / Administrative Staff', broad_field: 'Office and Administration', role_function: 'General Office Support', confidence: 90 },
  { t: ['encoder', 'data entry', 'data encoder', 'mag e-encode', 'encoding work', 'data capture'], title: 'Data Encoder', broad_field: 'Office and Administration', role_function: 'Clerical / Data Entry', confidence: 92 },
  { t: ['secretary', 'sekretarya', 'executive secretary', 'executive assistant'], title: 'Secretary', broad_field: 'Office and Administration', role_function: 'Secretarial / Administrative', confidence: 95 },
  { t: ['receptionist', 'front desk', 'desk officer', 'front office clerk'], title: 'Receptionist', broad_field: 'Office and Administration', role_function: 'Front Desk / Reception', confidence: 95 },
  { t: ['document controller', 'records officer', 'filing clerk', 'document management', 'records management'], title: 'Document Controller', broad_field: 'Office and Administration', role_function: 'Records Management', confidence: 90 },

  // ── Education & Teaching ────────────────────────────────────────────────────
  { t: ['teacher', 'guro', 'titser', 'maestra', 'maestro', 'teaching', 'deped teacher', 'public school teacher', 'private school teacher', 'elementary teacher', 'high school teacher', 'college teacher', 'mapeh teacher', 'tle teacher'], title: 'Teacher', broad_field: 'Education and Teaching', role_function: 'Teaching', confidence: 93 },
  { t: ['instructor', 'instruc', 'driving instructor', 'skills instructor', 'job instructor'], title: 'Instructor', broad_field: 'Education and Teaching', role_function: 'Teaching / Instruction', confidence: 92 },
  { t: ['trainer', 'corporate trainer', 'skills trainer', 'job trainer', 'training specialist', 'trade trainer', 'tesda trainer', 'livelihood trainer'], title: 'Trainer', broad_field: 'Education and Teaching', role_function: 'Training and Development', confidence: 90 },
  { t: ['professor', 'full professor', 'associate professor', 'assistant professor', 'college professor', 'university professor'], title: 'Professor', broad_field: 'Education and Teaching', role_function: 'Academic Teaching', confidence: 93 },
  { t: ['lecturer', 'part-time lecturer', 'college lecturer', 'university lecturer'], title: 'Lecturer', broad_field: 'Education and Teaching', role_function: 'Academic Teaching', confidence: 92 },
  { t: ['tutor', 'tutorial', 'tutoring', 'review center', 'private tutor', 'online tutor'], title: 'Tutor', broad_field: 'Education and Teaching', role_function: 'Tutoring', confidence: 90 },
  { t: ['facilitator', 'workshop facilitator', 'learning facilitator', 'seminar facilitator'], title: 'Facilitator', broad_field: 'Education and Teaching', role_function: 'Training / Facilitation', confidence: 88 },
  { t: ['guidance counselor', 'school counselor', 'guidance teacher', 'school guidance'], title: 'Guidance Counselor', broad_field: 'Education and Teaching', role_function: 'Guidance and Counseling', confidence: 92 },
  { t: ['school principal', 'principal', 'vice principal', 'school head', 'school director', 'school administrator'], title: 'School Principal', broad_field: 'Education and Teaching', role_function: 'School Administration', confidence: 90 },
  { t: ['librarian', 'school librarian', 'library aide', 'library staff', 'library technician'], title: 'Librarian', broad_field: 'Education and Teaching', role_function: 'Library Services', confidence: 90 },
  { t: ['preschool teacher', 'kindergarten teacher', 'kinder teacher', 'daycare teacher', 'nursery teacher', 'early childhood'], title: 'Early Childhood Teacher', broad_field: 'Education and Teaching', role_function: 'Early Childhood Education', confidence: 93 },
  { t: ['special education', 'sped teacher', 'special needs teacher', 'resource teacher', 'inclusion teacher'], title: 'Special Education Teacher', broad_field: 'Education and Teaching', role_function: 'Special Education', confidence: 93 },
  { t: ['online teacher', 'esl teacher', 'english teacher online', 'online english teacher', 'efl teacher'], title: 'Online Teacher / ESL Tutor', broad_field: 'Education and Teaching', role_function: 'Online Teaching', confidence: 90 },
  { t: ['coach', 'sports coach', 'athletic coach', 'basketball coach', 'volleyball coach'], title: 'Sports Coach', broad_field: 'Education and Teaching', role_function: 'Coaching / Athletics', confidence: 85 },
  { t: ['registrar', 'school registrar', 'college registrar', 'admissions officer'], title: 'School Registrar', broad_field: 'Education and Teaching', role_function: 'School Administration', confidence: 88 },

  // ── IT & Computer Work ──────────────────────────────────────────────────────
  { t: ['programmer', 'coder', 'coding', 'software developer', 'software dev', 'software engineer', 'software engineering'], title: 'Software Developer', broad_field: 'IT and Computer Work', role_function: 'Software Development', confidence: 90 },
  { t: ['web dev', 'web developer', 'webdev', 'website developer', 'web development'], title: 'Web Developer', broad_field: 'IT and Computer Work', role_function: 'Web Development', confidence: 93 },
  { t: ['react', 'reactjs', 'react dev', 'frontend dev', 'front end dev', 'vuejs dev', 'angular dev', 'javascript dev', 'frontend developer', 'ui developer'], title: 'Frontend Developer', broad_field: 'IT and Computer Work', role_function: 'Frontend Development', confidence: 90 },
  { t: ['backend dev', 'backend developer', 'nodejs', 'node.js dev', 'laravel dev', 'php dev', 'java dev', 'python dev', 'django dev', 'spring dev'], title: 'Backend Developer', broad_field: 'IT and Computer Work', role_function: 'Backend Development', confidence: 90 },
  { t: ['full stack', 'fullstack', 'full-stack developer', 'fullstack dev'], title: 'Full Stack Developer', broad_field: 'IT and Computer Work', role_function: 'Full Stack Development', confidence: 92 },
  { t: ['mobile dev', 'mobile developer', 'android dev', 'android developer', 'ios dev', 'ios developer', 'flutter dev', 'react native', 'app developer', 'app dev', 'mobile app'], title: 'Mobile Developer', broad_field: 'IT and Computer Work', role_function: 'Mobile App Development', confidence: 90 },
  { t: ['it support', 'tech support', 'helpdesk', 'help desk', 'tech guy', 'techie', 'computer guy', 'computer technician', 'it technician', 'it tech'], title: 'IT Support Technician', broad_field: 'IT and Computer Work', role_function: 'Technical Support', confidence: 93 },
  { t: ['network engineer', 'network admin', 'network administrator', 'network technician', 'cisco', 'ccna', 'network specialist'], title: 'Network Engineer', broad_field: 'IT and Computer Work', role_function: 'Network Administration', confidence: 92 },
  { t: ['system admin', 'sysadmin', 'systems administrator', 'it admin', 'it administrator', 'server admin'], title: 'System Administrator', broad_field: 'IT and Computer Work', role_function: 'Systems Administration', confidence: 92 },
  { t: ['data analyst', 'data analysis', 'business analyst', 'bi analyst', 'power bi', 'tableau', 'business intelligence'], title: 'Data Analyst', broad_field: 'IT and Computer Work', role_function: 'Data Analysis', confidence: 90 },
  { t: ['data scientist', 'machine learning', 'ml engineer', 'ai engineer', 'artificial intelligence', 'data science'], title: 'Data Scientist / ML Engineer', broad_field: 'IT and Computer Work', role_function: 'Data Science / AI', confidence: 90 },
  { t: ['cybersecurity', 'cyber security', 'information security', 'infosec', 'security analyst it', 'penetration test', 'pentest'], title: 'Cybersecurity Analyst', broad_field: 'IT and Computer Work', role_function: 'Cybersecurity', confidence: 90 },
  { t: ['cloud engineer', 'cloud architect', 'aws engineer', 'azure engineer', 'devops', 'dev ops', 'cloud computing'], title: 'Cloud / DevOps Engineer', broad_field: 'IT and Computer Work', role_function: 'Cloud / DevOps', confidence: 90 },
  { t: ['qa engineer', 'quality assurance engineer', 'software tester', 'test engineer', 'automation tester', 'software testing'], title: 'QA Engineer', broad_field: 'IT and Computer Work', role_function: 'Software Quality Assurance', confidence: 90 },
  { t: ['ui ux', 'ux designer', 'ui designer', 'user experience', 'user interface', 'product designer'], title: 'UI/UX Designer', broad_field: 'IT and Computer Work', role_function: 'UI/UX Design', confidence: 90 },
  { t: ['database admin', 'dba', 'database administrator', 'database developer', 'sql developer'], title: 'Database Administrator', broad_field: 'IT and Computer Work', role_function: 'Database Management', confidence: 92 },
  { t: ['it manager', 'it director', 'it head', 'tech lead', 'solutions architect', 'cto', 'chief technology'], title: 'IT Manager / Tech Lead', broad_field: 'IT and Computer Work', role_function: 'IT Management', confidence: 88 },
  { t: ['erp consultant', 'sap consultant', 'sap analyst', 'oracle consultant', 'dynamics consultant'], title: 'ERP Consultant', broad_field: 'IT and Computer Work', role_function: 'ERP / Systems Consulting', confidence: 88 },
  { t: ['game developer', 'game dev', 'unity developer', 'unreal developer', 'game designer'], title: 'Game Developer', broad_field: 'IT and Computer Work', role_function: 'Game Development', confidence: 90 },

  // ── Healthcare ──────────────────────────────────────────────────────────────
  { t: ['nurse', 'nars', 'nursing', 'ward nurse', 'icu nurse', 'er nurse', 'or nurse', 'clinic nurse', 'hospital nurse', 'operating room nurse'], title: 'Registered Nurse', broad_field: 'Healthcare', role_function: 'Nursing', confidence: 90 },
  { t: ['midwife', 'komadrona', 'hilot', 'maternal care'], title: 'Midwife', broad_field: 'Healthcare', role_function: 'Midwifery', confidence: 92 },
  { t: ['doctor', 'physician', 'general practitioner', 'medical doctor', 'licentiate medicine', 'specialist doctor', 'internist', 'surgeon'], title: 'Physician / Doctor', broad_field: 'Healthcare', role_function: 'Medical Practice', confidence: 93 },
  { t: ['dentist', 'dental doctor', 'dmd', 'dds', 'dental surgeon', 'orthodontist', 'oral surgeon'], title: 'Dentist', broad_field: 'Healthcare', role_function: 'Dentistry', confidence: 95 },
  { t: ['pharmacist', 'pharmacy', 'drug store staff', 'pharmacy assistant', 'pharmacy technician'], title: 'Pharmacist', broad_field: 'Healthcare', role_function: 'Pharmacy', confidence: 92 },
  { t: ['medical technologist', 'med tech', 'medtech', 'laboratory technologist', 'clinical laboratory', 'lab technologist'], title: 'Medical Technologist', broad_field: 'Healthcare', role_function: 'Medical Laboratory', confidence: 93 },
  { t: ['radiologic technologist', 'radtech', 'rad tech', 'x-ray tech', 'xray tech', 'radiographer', 'radiologic tech', 'mri tech'], title: 'Radiologic Technologist', broad_field: 'Healthcare', role_function: 'Radiology / Imaging', confidence: 93 },
  { t: ['physical therapist', 'physiotherapist', 'pt therapist', 'physical therapy', 'rehab therapist'], title: 'Physical Therapist', broad_field: 'Healthcare', role_function: 'Physical Therapy', confidence: 93 },
  { t: ['occupational therapist', 'ot therapist', 'occupational therapy'], title: 'Occupational Therapist', broad_field: 'Healthcare', role_function: 'Occupational Therapy', confidence: 93 },
  { t: ['speech therapist', 'speech pathologist', 'slp', 'speech language', 'speech clinician'], title: 'Speech Therapist', broad_field: 'Healthcare', role_function: 'Speech Therapy', confidence: 93 },
  { t: ['dietitian', 'nutritionist', 'registered nutritionist', 'nutrition officer'], title: 'Dietitian / Nutritionist', broad_field: 'Healthcare', role_function: 'Nutrition and Dietetics', confidence: 92 },
  { t: ['psychologist', 'clinical psychologist', 'counseling psychologist', 'registered psychologist'], title: 'Psychologist', broad_field: 'Healthcare', role_function: 'Psychology', confidence: 92 },
  { t: ['medical assistant', 'clinical assistant', 'nursing aide', 'nurse aide', 'nursing assistant', 'patient care aide', 'ward aide'], title: 'Medical / Nursing Aide', broad_field: 'Healthcare', role_function: 'Healthcare Support', confidence: 90 },
  { t: ['paramedic', 'emt', 'emergency medical', 'ambulance staff', 'emergency responder'], title: 'Paramedic / EMT', broad_field: 'Healthcare', role_function: 'Emergency Medical Services', confidence: 92 },
  { t: ['optometrist', 'optical assistant', 'optician', 'eye care specialist', 'optical staff'], title: 'Optometrist', broad_field: 'Healthcare', role_function: 'Optometry / Eye Care', confidence: 90 },
  { t: ['bhw', 'barangay health worker', 'community health worker', 'health aide', 'rural health worker'], title: 'Barangay Health Worker', broad_field: 'Healthcare', role_function: 'Community Health', confidence: 88 },
  { t: ['dental assistant', 'dental aide', 'dental technician', 'dental hygienist'], title: 'Dental Assistant', broad_field: 'Healthcare', role_function: 'Dental Support', confidence: 90 },
  { t: ['caregiver', 'care giver', 'tagapag-alaga', 'care aide', 'carer', 'personal care aide', 'elder care'], title: 'Caregiver', broad_field: 'Caregiving and Personal Care', role_function: 'Caregiving', confidence: 95 },

  // ── Engineering & Architecture ──────────────────────────────────────────────
  { t: ['civil engineer', 'structural engineer', 'site engineer civil', 'civil engineering', 'geotechnical engineer'], title: 'Civil Engineer', broad_field: 'Engineering and Architecture', role_function: 'Civil / Structural Engineering', confidence: 95 },
  { t: ['mechanical engineer', 'mechanical engineering', 'mechanical technologist'], title: 'Mechanical Engineer', broad_field: 'Engineering and Architecture', role_function: 'Mechanical Engineering', confidence: 95 },
  { t: ['electrical engineer', 'power engineer', 'electrical engineering'], title: 'Electrical Engineer', broad_field: 'Engineering and Architecture', role_function: 'Electrical Engineering', confidence: 95 },
  { t: ['electronics engineer', 'ece', 'electronics and communications', 'rf engineer', 'electronics engineering'], title: 'Electronics Engineer', broad_field: 'Engineering and Architecture', role_function: 'Electronics Engineering', confidence: 93 },
  { t: ['chemical engineer', 'chemical engineering', 'process engineer chemical', 'process engineering'], title: 'Chemical Engineer', broad_field: 'Engineering and Architecture', role_function: 'Chemical Engineering', confidence: 95 },
  { t: ['industrial engineer', 'industrial engineering', 'manufacturing engineer', 'ie officer'], title: 'Industrial Engineer', broad_field: 'Engineering and Architecture', role_function: 'Industrial Engineering', confidence: 95 },
  { t: ['environmental engineer', 'environmental scientist', 'environmental officer', 'pollution control officer', 'environmental engineering'], title: 'Environmental Engineer', broad_field: 'Engineering and Architecture', role_function: 'Environmental Engineering', confidence: 92 },
  { t: ['geodetic engineer', 'land surveyor', 'surveyor', 'geodesy', 'geodetic'], title: 'Geodetic Engineer / Surveyor', broad_field: 'Engineering and Architecture', role_function: 'Geodesy / Surveying', confidence: 93 },
  { t: ['mining engineer', 'geological engineer', 'geologist', 'mining technician'], title: 'Mining Engineer', broad_field: 'Engineering and Architecture', role_function: 'Mining Engineering', confidence: 92 },
  { t: ['architect', 'arkitekto', 'architecture', 'urban planner', 'landscape architect'], title: 'Architect', broad_field: 'Engineering and Architecture', role_function: 'Architecture / Design', confidence: 93 },
  { t: ['draftsman', 'drafter', 'cad operator', 'autocad', 'revit', 'drafting', 'technical drawing', 'cad drafter'], title: 'Draftsman / CAD Operator', broad_field: 'Engineering and Architecture', role_function: 'Technical Drawing / CAD', confidence: 90 },
  { t: ['project engineer', 'construction manager', 'site manager', 'project management engineer', 'project engineer site'], title: 'Project Engineer', broad_field: 'Engineering and Architecture', role_function: 'Project Management', confidence: 90 },
  { t: ['quantity surveyor', 'cost estimator', 'estimator', 'quantity survey', 'bill of quantities'], title: 'Quantity Surveyor', broad_field: 'Engineering and Architecture', role_function: 'Cost Estimation', confidence: 90 },
  { t: ['safety officer', 'safety engineer', 'ohs officer', 'oshs officer', 'safety manager', 'health and safety officer', 'workplace safety'], title: 'Safety Officer (OHS)', broad_field: 'Engineering and Architecture', role_function: 'Occupational Safety', confidence: 90 },
  { t: ['engineer', 'inhinyero', 'engineering work'], title: 'Engineer', broad_field: 'Engineering and Architecture', role_function: 'Engineering', confidence: 80 },

  // ── Construction ────────────────────────────────────────────────────────────
  { t: ['construction worker', 'construction laborer', 'konstraksyon', 'building worker', 'site worker', 'construction', 'laborer'], title: 'Construction Laborer', broad_field: 'Construction', role_function: 'General Construction Labor', confidence: 90 },
  { t: ['mason', 'kantero', 'bricklayer', 'tile setter', 'tiler', 'plasterer', 'masonry'], title: 'Mason / Tiler', broad_field: 'Construction', role_function: 'Masonry', confidence: 93 },
  { t: ['carpenter', 'karpintero', 'carpentry', 'furniture maker', 'cabinet maker', 'woodworker'], title: 'Carpenter', broad_field: 'Construction', role_function: 'Carpentry', confidence: 95 },
  { t: ['painter', 'pintor', 'house painter', 'building painter', 'paint job', 'painting work'], title: 'Painter', broad_field: 'Construction', role_function: 'Painting', confidence: 92 },
  { t: ['steel worker', 'ironworker', 'steel reinforcement', 'rebar', 'steel fabricator', 'rebars'], title: 'Steel / Rebar Worker', broad_field: 'Construction', role_function: 'Steel Works', confidence: 90 },
  { t: ['heavy equipment operator', 'crane operator', 'bulldozer operator', 'excavator operator', 'backhoe operator', 'payloader', 'grader operator'], title: 'Heavy Equipment Operator', broad_field: 'Construction', role_function: 'Equipment Operation', confidence: 92 },
  { t: ['construction foreman', 'site foreman', 'construction supervisor', 'site supervisor', 'foreman construction'], title: 'Construction Foreman', broad_field: 'Construction', role_function: 'Site Supervision', confidence: 90 },
  { t: ['building maintenance', 'facility maintenance', 'facilities management', 'building engineer', 'maintenance in charge'], title: 'Building Maintenance', broad_field: 'Construction', role_function: 'Facility Maintenance', confidence: 88 },

  // ── Skilled Trades & Repair ──────────────────────────────────────────────────
  { t: ['welder', 'welding', 'smaw', 'tig welder', 'mig welder', 'fabricator', 'metal fabricator', 'smaw welder'], title: 'Welder / Fabricator', broad_field: 'Skilled Trades and Repair', role_function: 'Welding', confidence: 95 },
  { t: ['electrician', 'elektrisyan', 'electrical worker', 'electrical installer', 'wireman'], title: 'Electrician', broad_field: 'Skilled Trades and Repair', role_function: 'Electrical Work', confidence: 95 },
  { t: ['plumber', 'tubero', 'plumbing', 'pipefitter', 'pipe welder'], title: 'Plumber', broad_field: 'Skilled Trades and Repair', role_function: 'Plumbing', confidence: 95 },
  { t: ['mechanic', 'mekaniko', 'auto repair', 'automotive mechanic', 'auto mechanic', 'car mechanic', 'motor repair'], title: 'Automotive Mechanic', broad_field: 'Skilled Trades and Repair', role_function: 'Automotive Repair', confidence: 92 },
  { t: ['aircon', 'aircondition', 'hvac', 'refrigeration', 'aircon technician', 'aircon tech'], title: 'Aircon / HVAC Technician', broad_field: 'Skilled Trades and Repair', role_function: 'HVAC / Refrigeration', confidence: 92 },
  { t: ['electronics technician', 'electronics repair', 'appliance repair', 'electronic tech', 'cellphone repair', 'gadget repair'], title: 'Electronics Technician', broad_field: 'Skilled Trades and Repair', role_function: 'Electronics Repair', confidence: 90 },
  { t: ['motorcycle mechanic', 'motorbike mechanic', 'motor tech', 'motorcycle repair', 'motosiklo'], title: 'Motorcycle Mechanic', broad_field: 'Skilled Trades and Repair', role_function: 'Motorcycle Repair', confidence: 90 },
  { t: ['tinsmith', 'sheet metal worker', 'tinworker', 'metal sheet'], title: 'Tinsmith / Sheet Metal Worker', broad_field: 'Skilled Trades and Repair', role_function: 'Sheet Metal Work', confidence: 88 },
  { t: ['dressmaker', 'modista', 'tailor', 'seamstress', 'mananahi', 'alterations', 'sewing'], title: 'Dressmaker / Tailor', broad_field: 'Skilled Trades and Repair', role_function: 'Tailoring / Dressmaking', confidence: 92 },

  // ── Food Service & Restaurants ──────────────────────────────────────────────
  { t: ['service crew', 'fast food crew', 'food crew', 'restaurant crew', 'crew member food'], title: 'Food Service Crew', broad_field: 'Food Service and Restaurants', role_function: 'Food Service', confidence: 92 },
  { t: ['waiter', 'waitress', 'food server', 'server', 'busboy', 'table service'], title: 'Waiter / Waitress', broad_field: 'Food Service and Restaurants', role_function: 'Food Service', confidence: 93 },
  { t: ['cook', 'chef', 'kusinero', 'kusinera', 'lutuin', 'head cook', 'sous chef', 'line cook', 'kitchen cook'], title: 'Cook / Chef', broad_field: 'Food Service and Restaurants', role_function: 'Cooking / Food Preparation', confidence: 92 },
  { t: ['pastry chef', 'baker', 'panadero', 'panadera', 'bread maker', 'pastry cook', 'cake decorator', 'confectioner'], title: 'Baker / Pastry Chef', broad_field: 'Food Service and Restaurants', role_function: 'Baking / Pastry', confidence: 93 },
  { t: ['barista', 'coffee barista', 'coffee maker', 'coffee staff'], title: 'Barista', broad_field: 'Food Service and Restaurants', role_function: 'Beverage Preparation', confidence: 93 },
  { t: ['bartender', 'barman', 'barmaid', 'mixologist'], title: 'Bartender', broad_field: 'Food Service and Restaurants', role_function: 'Bartending', confidence: 93 },
  { t: ['kitchen helper', 'kitchen assistant', 'kitchen staff', 'dishwasher', 'kitchen aide', 'utility kitchen', 'busboy kitchen'], title: 'Kitchen Helper', broad_field: 'Food Service and Restaurants', role_function: 'Kitchen Support', confidence: 90 },
  { t: ['restaurant manager', 'food service manager', 'canteen manager', 'cafeteria manager', 'resto manager'], title: 'Restaurant Manager', broad_field: 'Food Service and Restaurants', role_function: 'Restaurant Management', confidence: 88 },

  // ── BPO & Customer Service ──────────────────────────────────────────────────
  { t: ['call center', 'callcenter', 'contact center', 'csr', 'customer service rep', 'customer service representative'], title: 'Customer Service Representative', broad_field: 'BPO and Customer Service', role_function: 'Customer Service', confidence: 92 },
  { t: ['bpo', 'outsourcing', 'bpo agent', 'bpo worker'], title: 'BPO Agent', broad_field: 'BPO and Customer Service', role_function: 'Customer Service', confidence: 88 },
  { t: ['technical support representative', 'tsr', 'tech support rep', 'chat support', 'email support', 'it support rep'], title: 'Technical Support Representative', broad_field: 'BPO and Customer Service', role_function: 'Technical Support', confidence: 90 },
  { t: ['back office', 'back-office', 'bpo encoder', 'bpo admin', 'data processing bpo'], title: 'Back Office Associate', broad_field: 'BPO and Customer Service', role_function: 'Back Office Operations', confidence: 88 },
  { t: ['collections agent', 'collection officer', 'debt collector', 'collections representative'], title: 'Collections Agent', broad_field: 'BPO and Customer Service', role_function: 'Collections', confidence: 88 },

  // ── Retail & Sales ───────────────────────────────────────────────────────────
  { t: ['cashier', 'kahera', 'cashiering', 'cashier staff', 'cash register'], title: 'Retail Cashier', broad_field: 'Retail and Store Work', role_function: 'Cashiering', confidence: 95 },
  { t: ['sales agent', 'sales rep', 'sales representative', 'salesman', 'saleswoman', 'saleslady', 'sales person', 'sales staff'], title: 'Sales Agent', broad_field: 'Retail and Store Work', role_function: 'Sales', confidence: 88 },
  { t: ['tindera', 'tindero', 'tingi', 'nagtitinda', 'store staff', 'retail staff', 'sales associate'], title: 'Sales Clerk', broad_field: 'Retail and Store Work', role_function: 'Retail Sales', confidence: 90 },
  { t: ['merchandiser', 'product merchandiser', 'trade merchandiser', 'retail merchandiser', 'merch'], title: 'Merchandiser', broad_field: 'Retail and Store Work', role_function: 'Merchandising', confidence: 90 },
  { t: ['promodizer', 'promoter', 'product demonstrator', 'brand promoter', 'in-store promoter', 'product promoter'], title: 'Promodizer / Promoter', broad_field: 'Retail and Store Work', role_function: 'Product Promotion', confidence: 88 },
  { t: ['store manager', 'store supervisor', 'branch manager', 'retail manager', 'outlet manager', 'shop manager'], title: 'Store Manager', broad_field: 'Retail and Store Work', role_function: 'Retail Management', confidence: 88 },
  { t: ['real estate agent', 'property agent', 'real estate broker', 'property broker', 'real estate', 'property sales'], title: 'Real Estate Agent', broad_field: 'Retail and Store Work', role_function: 'Real Estate Sales', confidence: 88 },
  { t: ['insurance agent', 'insurance advisor', 'insurance sales', 'insurance representative', 'insurance officer'], title: 'Insurance Agent', broad_field: 'Retail and Store Work', role_function: 'Insurance Sales', confidence: 88 },
  { t: ['medical representative', 'med rep', 'pharma rep', 'pharmaceutical rep', 'detailer', 'drug representative', 'pharma sales'], title: 'Medical Representative', broad_field: 'Retail and Store Work', role_function: 'Medical Sales', confidence: 90 },

  // ── Marketing & Communications ──────────────────────────────────────────────
  { t: ['marketing officer', 'marketing staff', 'marketing assistant', 'marketing coordinator', 'marketing executive', 'marketing associate'], title: 'Marketing Officer', broad_field: 'Marketing and Communications', role_function: 'Marketing', confidence: 90 },
  { t: ['digital marketer', 'digital marketing', 'online marketing', 'digital marketing specialist', 'digital marketing officer'], title: 'Digital Marketing Specialist', broad_field: 'Marketing and Communications', role_function: 'Digital Marketing', confidence: 90 },
  { t: ['seo specialist', 'seo analyst', 'search engine optimization', 'sem specialist', 'google ads', 'ppc specialist'], title: 'SEO / SEM Specialist', broad_field: 'Marketing and Communications', role_function: 'Search Marketing', confidence: 90 },
  { t: ['content writer', 'copywriter', 'content creator writer', 'web content writer', 'technical writer', 'article writer', 'creative writer'], title: 'Content Writer / Copywriter', broad_field: 'Marketing and Communications', role_function: 'Content Writing', confidence: 90 },
  { t: ['social media manager', 'social media specialist', 'smm', 'community manager', 'social media officer'], title: 'Social Media Specialist', broad_field: 'Marketing and Communications', role_function: 'Social Media Management', confidence: 88 },
  { t: ['public relations', 'pr officer', 'communications officer', 'corporate communications', 'media relations'], title: 'PR / Communications Officer', broad_field: 'Marketing and Communications', role_function: 'Public Relations', confidence: 88 },
  { t: ['brand manager', 'brand officer', 'brand marketing', 'product manager marketing', 'product marketing manager'], title: 'Brand / Product Manager', broad_field: 'Marketing and Communications', role_function: 'Brand Management', confidence: 88 },

  // ── Accounting & Finance ────────────────────────────────────────────────────
  { t: ['accountant', 'accounting', 'acountant', 'bookkeeper', 'bookkeeping', 'cpa', 'certified public accountant'], title: 'Accountant', broad_field: 'Accounting and Finance', role_function: 'Accounting', confidence: 93 },
  { t: ['auditor', 'internal auditor', 'external auditor', 'audit staff', 'audit associate', 'financial auditor'], title: 'Auditor', broad_field: 'Accounting and Finance', role_function: 'Auditing', confidence: 92 },
  { t: ['financial analyst', 'finance analyst', 'budget analyst', 'financial planning', 'financial controller'], title: 'Financial Analyst', broad_field: 'Accounting and Finance', role_function: 'Financial Analysis', confidence: 90 },
  { t: ['payroll', 'payroll officer', 'payroll specialist', 'payroll staff', 'payroll admin'], title: 'Payroll Officer', broad_field: 'Accounting and Finance', role_function: 'Payroll Processing', confidence: 90 },
  { t: ['credit analyst', 'credit officer', 'loan officer', 'loan processor', 'loans officer', 'credit staff'], title: 'Credit / Loans Officer', broad_field: 'Accounting and Finance', role_function: 'Credit and Loans', confidence: 90 },
  { t: ['bank teller', 'bank clerk', 'bank staff', 'bank officer', 'banking staff', 'remittance officer', 'pawnshop clerk'], title: 'Bank Teller / Clerk', broad_field: 'Accounting and Finance', role_function: 'Banking Services', confidence: 90 },
  { t: ['treasurer', 'comptroller', 'chief accountant', 'accounting manager', 'finance manager', 'cfo', 'chief financial'], title: 'Finance Manager', broad_field: 'Accounting and Finance', role_function: 'Finance Management', confidence: 88 },

  // ── Human Resources ──────────────────────────────────────────────────────────
  { t: ['human resources', 'human resource', 'hrd', 'hr department', 'hr officer', 'hr staff', 'hr assistant'], title: 'Human Resource Officer', broad_field: 'Human Resources and Recruitment', role_function: 'HR / Recruitment', confidence: 88 },
  { t: ['recruiter', 'recruitment', 'talent acquisition', 'headhunter', 'staffing officer', 'hiring officer', 'sourcer'], title: 'Recruiter', broad_field: 'Human Resources and Recruitment', role_function: 'Recruitment', confidence: 90 },
  { t: ['training officer', 'learning and development', 'l&d officer', 'training specialist', 'hr trainer', 'organizational development', 'od officer'], title: 'Training Officer', broad_field: 'Human Resources and Recruitment', role_function: 'Training and Development', confidence: 90 },
  { t: ['compensation and benefits', 'benefits officer', 'employee benefits', 'hris officer', 'c&b officer'], title: 'Compensation & Benefits Officer', broad_field: 'Human Resources and Recruitment', role_function: 'Compensation and Benefits', confidence: 90 },
  { t: ['employee relations', 'labor relations', 'industrial relations', 'labor compliance', 'er officer'], title: 'Employee / Labor Relations Officer', broad_field: 'Human Resources and Recruitment', role_function: 'Employee Relations', confidence: 88 },

  // ── Security Services ────────────────────────────────────────────────────────
  { t: ['security guard', 'guard', 'guwardiya', 'sekyu', 'security officer', 'loss prevention'], title: 'Security Guard', broad_field: 'Security and Protective Services', role_function: 'Security / Protection', confidence: 93 },
  { t: ['cctv operator', 'cctv technician', 'surveillance officer', 'monitoring officer', 'cctv installer'], title: 'CCTV / Surveillance Operator', broad_field: 'Security and Protective Services', role_function: 'Surveillance', confidence: 90 },
  { t: ['police', 'pulis', 'pnp', 'police officer', 'law enforcement', 'patrolman', 'detective'], title: 'Police Officer', broad_field: 'Security and Protective Services', role_function: 'Law Enforcement', confidence: 90 },
  { t: ['firefighter', 'fire fighter', 'bfp', 'fire marshall', 'fire officer', 'fire brigade'], title: 'Firefighter', broad_field: 'Security and Protective Services', role_function: 'Fire Fighting', confidence: 92 },
  { t: ['bodyguard', 'personal security', 'executive protection', 'bouncer', 'doorman guard'], title: 'Bodyguard / Security Personnel', broad_field: 'Security and Protective Services', role_function: 'Personal Protection', confidence: 88 },

  // ── Driving & Transportation ─────────────────────────────────────────────────
  { t: ['driver', 'drayber', 'tsuper', 'company driver', 'executive driver', 'van driver', 'shuttle driver'], title: 'Driver', broad_field: 'Driving and Transportation', role_function: 'Driving / Transportation', confidence: 88 },
  { t: ['bus driver', 'truck driver', 'ten-wheeler', '10-wheeler', 'trailer driver', 'cargo driver'], title: 'Bus / Truck Driver', broad_field: 'Driving and Transportation', role_function: 'Commercial Vehicle Driving', confidence: 90 },
  { t: ['tricycle driver', 'trike driver', 'pedicab driver', 'jeepney driver', 'uv express driver'], title: 'Light Transport Driver', broad_field: 'Driving and Transportation', role_function: 'Public Transport', confidence: 88 },
  { t: ['taxi driver', 'grab driver', 'tnvs driver', 'angkas driver', 'ride share driver'], title: 'TNVS / Taxi Driver', broad_field: 'Driving and Transportation', role_function: 'Ride-Hailing / Taxi', confidence: 88 },
  { t: ['delivery rider', 'grab rider', 'foodpanda rider', 'lalamove rider', 'motorcycle delivery', 'delivery motorcycle'], title: 'Delivery Rider', broad_field: 'Delivery and Courier Work', role_function: 'Delivery / Courier', confidence: 92 },
  { t: ['delivery man', 'delivery boy', 'courier', 'messenger', 'dispatch rider', 'delivery worker'], title: 'Delivery Courier', broad_field: 'Delivery and Courier Work', role_function: 'Delivery / Courier', confidence: 90 },
  { t: ['seaman', 'seafarer', 'sailor', 'marino', 'maritime', 'deck officer', 'ship officer', 'bosun', 'able seaman', 'oiler ship'], title: 'Seafarer', broad_field: 'Driving and Transportation', role_function: 'Maritime / Seafaring', confidence: 90 },
  { t: ['flight attendant', 'cabin crew', 'airline staff', 'stewardess', 'steward airline'], title: 'Flight Attendant / Cabin Crew', broad_field: 'Driving and Transportation', role_function: 'Aviation / Air Crew', confidence: 93 },

  // ── Warehouse & Logistics ────────────────────────────────────────────────────
  { t: ['warehouse', 'bodegero', 'warehouseman', 'warehousing', 'warehouse staff', 'warehouse worker'], title: 'Warehouse Worker', broad_field: 'Warehouse and Logistics', role_function: 'Warehouse Operations', confidence: 90 },
  { t: ['forklift operator', 'forklift driver', 'reach truck operator', 'pallet jack operator', 'forklift'], title: 'Forklift Operator', broad_field: 'Warehouse and Logistics', role_function: 'Equipment Operation', confidence: 93 },
  { t: ['logistics officer', 'logistics coordinator', 'logistics staff', 'logistics manager', 'supply chain officer'], title: 'Logistics Officer', broad_field: 'Warehouse and Logistics', role_function: 'Logistics', confidence: 90 },
  { t: ['procurement officer', 'purchasing officer', 'buyer', 'purchasing staff', 'procurement staff', 'purchasing agent'], title: 'Procurement / Purchasing Officer', broad_field: 'Warehouse and Logistics', role_function: 'Procurement', confidence: 90 },
  { t: ['inventory officer', 'inventory manager', 'inventory controller', 'stock controller', 'stock manager', 'inventory staff'], title: 'Inventory Officer', broad_field: 'Warehouse and Logistics', role_function: 'Inventory Management', confidence: 90 },
  { t: ['customs broker', 'freight forwarder', 'import export', 'shipping officer', 'cargo officer', 'freight officer'], title: 'Customs Broker / Freight Forwarder', broad_field: 'Warehouse and Logistics', role_function: 'Customs and Freight', confidence: 90 },

  // ── Manufacturing & Factory ──────────────────────────────────────────────────
  { t: ['factory worker', 'factory', 'pabrika', 'production worker', 'manufacturing worker', 'plant worker'], title: 'Factory / Production Worker', broad_field: 'Manufacturing and Factory Work', role_function: 'Production / Assembly', confidence: 90 },
  { t: ['machine operator', 'press operator', 'cnc operator', 'lathe operator', 'machine operation'], title: 'Machine Operator', broad_field: 'Manufacturing and Factory Work', role_function: 'Machine Operation', confidence: 88 },
  { t: ['assembler', 'assembly worker', 'production assembler', 'line assembler', 'assembly line worker'], title: 'Assembler', broad_field: 'Manufacturing and Factory Work', role_function: 'Assembly', confidence: 90 },
  { t: ['quality control', 'qc inspector', 'quality inspector', 'production inspector', 'qa inspector', 'qc staff'], title: 'Quality Control Inspector', broad_field: 'Manufacturing and Factory Work', role_function: 'Quality Control', confidence: 90 },
  { t: ['packer', 'packaging worker', 'packing staff', 'packaging operator', 'packing operator'], title: 'Packer / Packaging Worker', broad_field: 'Manufacturing and Factory Work', role_function: 'Packaging', confidence: 88 },
  { t: ['garment worker', 'sewist', 'sewing machine operator', 'textile worker', 'garment factory worker'], title: 'Garment / Textile Worker', broad_field: 'Manufacturing and Factory Work', role_function: 'Garment Production', confidence: 90 },
  { t: ['semiconductor', 'electronics assembly', 'pcb assembly', 'circuit board', 'microelectronics worker'], title: 'Electronics Assembly Worker', broad_field: 'Manufacturing and Factory Work', role_function: 'Electronics Manufacturing', confidence: 88 },
  { t: ['printer', 'press operator print', 'digital printer', 'offset printer', 'tarpaulin maker', 'signage maker', 'screen printing'], title: 'Printer / Signage Maker', broad_field: 'Manufacturing and Factory Work', role_function: 'Printing / Signage', confidence: 88 },

  // ── Agriculture & Farming ────────────────────────────────────────────────────
  { t: ['farmer', 'magsasaka', 'farm worker', 'farming', 'crop farmer', 'rice farmer', 'vegetable farmer', 'crop production'], title: 'Farm Worker', broad_field: 'Agriculture and Farming', role_function: 'Farming / Crop Production', confidence: 92 },
  { t: ['fisherman', 'mangingisda', 'fishing', 'fish farmer', 'aquaculture worker', 'fish culture'], title: 'Fisherman', broad_field: 'Fishing and Fish Processing', role_function: 'Fishing', confidence: 93 },
  { t: ['livestock farmer', 'pig farmer', 'hog raiser', 'poultry farmer', 'chicken farmer', 'animal husbandry', 'goat farmer'], title: 'Livestock / Poultry Farmer', broad_field: 'Agriculture and Farming', role_function: 'Livestock Farming', confidence: 90 },
  { t: ['agri-technician', 'agricultural technician', 'farm technician', 'agri tech', 'crop technician'], title: 'Agricultural Technician', broad_field: 'Agriculture and Farming', role_function: 'Agricultural Technology', confidence: 90 },

  // ── Household & Domestic Services ────────────────────────────────────────────
  { t: ['kasambahay', 'katulong', 'domestic helper', 'yaya', 'nanny', 'babysitter', 'house helper', 'housemaid'], title: 'Household Helper', broad_field: 'Household and Domestic Services', role_function: 'Domestic Service', confidence: 92 },
  { t: ['labandera', 'labandero', 'laundry', 'laundry worker', 'laundry aide', 'ironing'], title: 'Laundry Worker', broad_field: 'Household and Domestic Services', role_function: 'Laundry Services', confidence: 90 },
  { t: ['janitor', 'janitress', 'janitorial staff', 'cleaning staff', 'cleaner', 'utility man', 'utility aide', 'janitor maintenance'], title: 'Janitor / Custodial Staff', broad_field: 'Household and Domestic Services', role_function: 'Janitorial / Cleaning', confidence: 92 },
  { t: ['gardener', 'hardinero', 'groundskeeper', 'landscaper', 'lawn care', 'grounds maintenance'], title: 'Gardener / Groundskeeper', broad_field: 'Household and Domestic Services', role_function: 'Grounds Maintenance', confidence: 90 },

  // ── Beauty & Wellness ─────────────────────────────────────────────────────────
  { t: ['barber', 'barbero', 'hairdresser', 'hair stylist', 'hair dresser', 'salon staff', 'salon worker'], title: 'Barber / Hairdresser', broad_field: 'Beauty and Wellness', role_function: 'Haircutting / Styling', confidence: 92 },
  { t: ['massage', 'masahista', 'massage therapist', 'spa therapist', 'body therapist'], title: 'Massage Therapist', broad_field: 'Beauty and Wellness', role_function: 'Wellness / Massage', confidence: 90 },
  { t: ['nail technician', 'nail artist', 'nail tech', 'manicurist', 'pedicurist', 'nail salon'], title: 'Nail Technician', broad_field: 'Beauty and Wellness', role_function: 'Nail Care', confidence: 92 },
  { t: ['lash artist', 'lash technician', 'eyelash extension', 'lash stylist', 'lash tech'], title: 'Lash Technician', broad_field: 'Beauty and Wellness', role_function: 'Lash Services', confidence: 92 },
  { t: ['aesthetician', 'esthetician', 'skincare specialist', 'facialist', 'derma therapist', 'slimming therapist', 'beauty therapist', 'cosmetologist'], title: 'Aesthetician / Skincare Specialist', broad_field: 'Beauty and Wellness', role_function: 'Skincare / Aesthetics', confidence: 90 },
  { t: ['fitness instructor', 'gym trainer', 'personal trainer', 'fitness trainer', 'gym instructor', 'aerobics instructor', 'yoga instructor', 'pilates instructor', 'fitness coach', 'gym staff'], title: 'Fitness Instructor / Personal Trainer', broad_field: 'Beauty and Wellness', role_function: 'Fitness Training', confidence: 90 },
  { t: ['makeup artist', 'mua', 'makeup pro', 'bridal makeup', 'event makeup'], title: 'Makeup Artist', broad_field: 'Beauty and Wellness', role_function: 'Makeup / Cosmetology', confidence: 92 },

  // ── Hospitality & Hotels ──────────────────────────────────────────────────────
  { t: ['housekeeping', 'room attendant', 'hotel housekeeping', 'hotel room attendant', 'room cleaner'], title: 'Room Attendant / Housekeeping', broad_field: 'Hospitality and Hotels', role_function: 'Housekeeping', confidence: 90 },
  { t: ['hotel front desk', 'hotel receptionist', 'hotel front office', 'guest relations', 'concierge', 'bellman', 'guest service agent', 'hotel staff'], title: 'Hotel Front Office Staff', broad_field: 'Hospitality and Hotels', role_function: 'Front Office / Guest Services', confidence: 90 },
  { t: ['event coordinator', 'events coordinator', 'event manager', 'events planner', 'event planner', 'wedding coordinator', 'wedding planner', 'catering coordinator'], title: 'Event Coordinator', broad_field: 'Hospitality and Hotels', role_function: 'Events / Catering', confidence: 90 },
  { t: ['tour guide', 'travel guide', 'tourism officer', 'travel agent', 'travel consultant', 'ticketing officer'], title: 'Tour Guide / Travel Agent', broad_field: 'Hospitality and Hotels', role_function: 'Tourism / Travel', confidence: 88 },

  // ── Online & Digital Work ─────────────────────────────────────────────────────
  { t: ['virtual assistant', 'va work', 'online va', 'executive va', 'admin va', 'remote assistant'], title: 'Virtual Assistant', broad_field: 'Online and Digital Work', role_function: 'Remote Administrative Support', confidence: 90 },
  { t: ['online seller', 'online selling', 'e-commerce', 'ecommerce', 'lazada seller', 'shopee seller', 'tiktok seller', 'online store'], title: 'Online Seller', broad_field: 'Online and Digital Work', role_function: 'E-Commerce / Online Sales', confidence: 88 },
  { t: ['content creator', 'vlogger', 'youtuber', 'tiktok creator', 'influencer', 'digital creator'], title: 'Content Creator / Influencer', broad_field: 'Online and Digital Work', role_function: 'Content Creation', confidence: 85 },
  { t: ['freelancer', 'freelance', 'freelancing', 'gig worker', 'remote worker'], title: 'Freelancer', broad_field: 'Online and Digital Work', role_function: 'Freelance Work', confidence: 75 },

  // ── Media Arts & Design ───────────────────────────────────────────────────────
  { t: ['graphic designer', 'graphic artist', 'graphics designer', 'visual artist', 'layout artist', 'visual designer'], title: 'Graphic Designer', broad_field: 'Media Arts and Design', role_function: 'Graphic Design', confidence: 92 },
  { t: ['photographer', 'litratista', 'photo editor', 'photo studio staff', 'photography'], title: 'Photographer', broad_field: 'Media Arts and Design', role_function: 'Photography', confidence: 90 },
  { t: ['video editor', 'videographer', 'video editing', 'video production', 'cinematographer', 'filmmaker'], title: 'Videographer / Video Editor', broad_field: 'Media Arts and Design', role_function: 'Video Production', confidence: 90 },
  { t: ['animator', '2d animator', '3d animator', 'motion graphics', 'motion designer', 'animation artist'], title: 'Animator / Motion Designer', broad_field: 'Media Arts and Design', role_function: 'Animation', confidence: 90 },
  { t: ['illustrator', 'digital artist', 'comic artist', 'storyboard artist', 'digital illustration'], title: 'Illustrator / Digital Artist', broad_field: 'Media Arts and Design', role_function: 'Digital Illustration', confidence: 90 },
  { t: ['journalist', 'reporter', 'news writer', 'editor writer', 'proofreader', 'copyeditor', 'print media'], title: 'Journalist / Editor', broad_field: 'Media Arts and Design', role_function: 'Journalism / Editorial', confidence: 88 },
  { t: ['broadcaster', 'radio announcer', 'disc jockey', 'on-air personality', 'tv host', 'news anchor', 'emcee'], title: 'Broadcaster / Media Personality', broad_field: 'Media Arts and Design', role_function: 'Broadcasting / Media', confidence: 88 },
  { t: ['fashion designer', 'clothing designer', 'costume designer', 'wardrobe stylist', 'fashion stylist', 'fashion design'], title: 'Fashion Designer', broad_field: 'Media Arts and Design', role_function: 'Fashion Design', confidence: 88 },

  // ── Legal ─────────────────────────────────────────────────────────────────────
  { t: ['lawyer', 'attorney', 'abogado', 'barrister', 'litigator', 'public attorney', 'atty', 'legal counsel'], title: 'Lawyer / Attorney', broad_field: 'Legal and Justice', role_function: 'Legal Practice', confidence: 95 },
  { t: ['paralegal', 'legal assistant', 'legal secretary', 'legal aide', 'legal staff', 'legal officer'], title: 'Paralegal / Legal Assistant', broad_field: 'Legal and Justice', role_function: 'Legal Support', confidence: 92 },
  { t: ['notary', 'notary public', 'notarial staff', 'clerk of court', 'court employee', 'judiciary staff'], title: 'Notary / Court Staff', broad_field: 'Legal and Justice', role_function: 'Notarial / Court Services', confidence: 90 },

  // ── Government & Public Service ────────────────────────────────────────────────
  { t: ['government employee', 'civil servant', 'government worker', 'public servant', 'lgu employee', 'city hall', 'municipal staff', 'government staff', 'ngo staff'], title: 'Government Employee', broad_field: 'Public Administration', role_function: 'Government Service', confidence: 85 },
  { t: ['barangay official', 'barangay captain', 'barangay secretary', 'barangay treasurer', 'barangay kagawad', 'barangay staff', 'barangay tanod'], title: 'Barangay Official / Staff', broad_field: 'Public Administration', role_function: 'Barangay Governance', confidence: 90 },
  { t: ['peso officer', 'peso staff', 'peso worker', 'public employment officer', 'employment officer'], title: 'PESO Officer', broad_field: 'Public Administration', role_function: 'Employment Services', confidence: 90 },
  { t: ['social worker', 'case worker', 'family welfare worker', 'dswd worker', 'dswd staff', 'child welfare worker', 'community development officer'], title: 'Social Worker', broad_field: 'Public Administration', role_function: 'Social Welfare', confidence: 90 },
  { t: ['military', 'soldier', 'sundalo', 'army', 'navy', 'air force', 'afp', 'armed forces', 'coast guard'], title: 'Military Personnel', broad_field: 'Armed Forces and Defense', role_function: 'Military Service', confidence: 90 },
]

// ─── Keyword-pattern fallback (catches anything not in INSTANT_DICT) ────────────
// Used only when INSTANT_DICT returns no results.
const KEYWORD_PATTERNS = [
  { p: ['teach', 'instruc', 'educat', 'lectur', 'profes', 'facilitat', 'academ', 'tutori', 'mentor', 'schooling', 'deped', 'tesda'], title: 'Teacher / Instructor', broad_field: 'Education and Teaching', role_function: 'Teaching / Instruction', confidence: 78 },
  { p: ['develop', 'programm', 'software', 'frontend', 'backend', 'fullstack', 'devops', 'sysadmin', 'network admin', 'cloud eng', 'database', 'cybersec', 'data scien', 'machine learn', 'artificial intel', 'it specialist', 'computer staff'], title: 'IT Professional', broad_field: 'IT and Computer Work', role_function: 'Technology / IT', confidence: 75 },
  { p: ['physic', 'therapist', 'surgeon', 'laboratori', 'radiolog', 'pharmacol', 'dentistr', 'optom', 'nursing student', 'clinical', 'medical staff', 'health worker', 'hospital staff'], title: 'Healthcare Worker', broad_field: 'Healthcare', role_function: 'Healthcare Services', confidence: 75 },
  { p: ['civil eng', 'structural eng', 'mechanical eng', 'electrical eng', 'electronics eng', 'chemical eng', 'industrial eng', 'environmental eng', 'geodetic', 'mining eng', 'structural design', 'quantity survey'], title: 'Engineer', broad_field: 'Engineering and Architecture', role_function: 'Engineering', confidence: 78 },
  { p: ['sales marketing', 'product sales', 'marketing work', 'sales work', 'brand promot', 'market develop', 'sales support'], title: 'Sales / Marketing Professional', broad_field: 'Retail and Store Work', role_function: 'Sales and Marketing', confidence: 70 },
  { p: ['finance', 'audit', 'payroll', 'treasury', 'banking', 'credit work', 'loans work', 'accounting work', 'budget work', 'tax work'], title: 'Finance / Accounting Professional', broad_field: 'Accounting and Finance', role_function: 'Accounting and Finance', confidence: 75 },
  { p: ['legal work', 'law work', 'paralegal work', 'court work', 'judicial', 'notarial work', 'justice work'], title: 'Legal Professional', broad_field: 'Legal and Justice', role_function: 'Legal Services', confidence: 78 },
  { p: ['weld', 'electrica work', 'plumb', 'mechan work', 'repair work', 'hvac', 'refrigerat', 'electrical work'], title: 'Skilled Tradesperson', broad_field: 'Skilled Trades and Repair', role_function: 'Skilled Trades', confidence: 75 },
  { p: ['construct work', 'building work', 'mason work', 'carpent', 'painting work', 'site work', 'civil work'], title: 'Construction Worker', broad_field: 'Construction', role_function: 'Construction', confidence: 75 },
  { p: ['cooking', 'culinar', 'kitchen work', 'restaurant work', 'catering work', 'food prep', 'baking work', 'beverage work'], title: 'Food Service Worker', broad_field: 'Food Service and Restaurants', role_function: 'Food Service', confidence: 75 },
  { p: ['security work', 'guard work', 'protect', 'surveil', 'patrol work', 'law enforcement work'], title: 'Security / Protection Services', broad_field: 'Security and Protective Services', role_function: 'Security', confidence: 75 },
  { p: ['transport work', 'logistics work', 'delivery work', 'courier work', 'fleet work', 'cargo work', 'shipping work', 'driving work'], title: 'Driver / Logistics', broad_field: 'Driving and Transportation', role_function: 'Transportation', confidence: 73 },
  { p: ['manufactur', 'assembl work', 'production work', 'packag work', 'garment work', 'textile work', 'factory work', 'plant work'], title: 'Manufacturing Worker', broad_field: 'Manufacturing and Factory Work', role_function: 'Manufacturing', confidence: 73 },
  { p: ['farm work', 'agri', 'crop work', 'harvest', 'livestock work', 'poultry work', 'aquaculture'], title: 'Agriculture / Farming', broad_field: 'Agriculture and Farming', role_function: 'Agriculture', confidence: 73 },
  { p: ['welfare work', 'community work', 'outreach work', 'social serv', 'government serv', 'public serv', 'lgu work', 'barangay work'], title: 'Government / Social Services', broad_field: 'Public Administration', role_function: 'Public Service', confidence: 70 },
  { p: ['salon work', 'spa work', 'nail work', 'lash work', 'hair work', 'makeup work', 'aesthet', 'cosmet', 'grooming work', 'fitness work', 'wellness work'], title: 'Beauty / Wellness Professional', broad_field: 'Beauty and Wellness', role_function: 'Beauty and Wellness', confidence: 73 },
  { p: ['design work', 'creative work', 'art work', 'photo work', 'video work', 'animat', 'illustr', 'media work', 'broadcast', 'journal work', 'writing work', 'content work'], title: 'Creative / Media Professional', broad_field: 'Media Arts and Design', role_function: 'Creative Work', confidence: 70 },
  { p: ['hotel work', 'hospitality work', 'tourism work', 'travel work', 'event work', 'catering work', 'resort work'], title: 'Hospitality / Tourism', broad_field: 'Hospitality and Hotels', role_function: 'Hospitality', confidence: 73 },
  { p: ['customer service', 'phone support', 'live chat work', 'bpo work', 'contact center work', 'inbound', 'outbound'], title: 'Customer Service / BPO', broad_field: 'BPO and Customer Service', role_function: 'Customer Service', confidence: 75 },
  { p: ['human resource work', 'recruitment work', 'talent work', 'personnel work', 'staffing work', 'hiring work'], title: 'Human Resources', broad_field: 'Human Resources and Recruitment', role_function: 'Human Resources', confidence: 75 },
  { p: ['warehouse work', 'inventory work', 'procurement work', 'purchasing work', 'supply chain work', 'customs work', 'freight work', 'logistics officer work'], title: 'Logistics / Supply Chain', broad_field: 'Warehouse and Logistics', role_function: 'Logistics', confidence: 73 },
]

// ─── Matching function ─────────────────────────────────────────────────────────
function matchesTrigger(q, trigger) {
  if (q === trigger) return true
  if (trigger.length < 3) return false  // Skip very short triggers
  if (q.includes(trigger)) return true  // q contains the full trigger
  // Prefix match: user is still typing (e.g. "instruc" → matches "instructor")
  if (trigger.length > q.length && trigger.startsWith(q) && q.length >= 3) return true
  return false
}

function getInstantMatches(query) {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []
  const results = []
  const seen = new Set()

  // Layer 1: precise dictionary matching
  for (const entry of INSTANT_DICT) {
    if (entry.t.some(trigger => matchesTrigger(q, trigger))) {
      const key = entry.title.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          occupation_title: entry.title,
          broad_field:      entry.broad_field,
          role_function:    entry.role_function,
          confidence:       entry.confidence,
          source:           'dictionary',
          reason:           `Matched instantly for "${query}".`,
          occupation_id:    null,
          general_term:     null,
        })
      }
    }
  }

  // Layer 2: keyword-pattern fallback (only if nothing matched yet)
  if (results.length === 0 && q.length >= 4) {
    for (const kw of KEYWORD_PATTERNS) {
      if (kw.p.some(p => q.includes(p))) {
        const key = kw.title.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          results.push({
            occupation_title: kw.title,
            broad_field:      kw.broad_field,
            role_function:    kw.role_function,
            confidence:       kw.confidence,
            source:           'dictionary',
            reason:           `Keyword pattern matched for "${query}".`,
            occupation_id:    null,
            general_term:     null,
          })
          break
        }
      }
    }
  }

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

// ─── Manual broad-field fallback list ──────────────────────────────────────────
const BROAD_FIELDS = [
  { key: 'it',              title: 'Information Technology',        generalTerm: 'it work' },
  { key: 'office',          title: 'Administrative and Office Support', generalTerm: 'office work' },
  { key: 'sales',           title: 'Sales and Marketing',           generalTerm: 'retail work' },
  { key: 'healthcare',      title: 'Healthcare',                    generalTerm: 'healthcare work' },
  { key: 'education',       title: 'Education and Teaching',        generalTerm: 'education work' },
  { key: 'construction',    title: 'Construction',                  generalTerm: 'construction work' },
  { key: 'food',            title: 'Hospitality and Food Service',  generalTerm: 'restaurant work' },
  { key: 'transport',       title: 'Transportation and Logistics',  generalTerm: 'driver' },
  { key: 'manufacturing',   title: 'Manufacturing',                 generalTerm: 'factory worker' },
  { key: 'agriculture',     title: 'Agriculture',                   generalTerm: 'agriculture work' },
  { key: 'finance',         title: 'Finance and Accounting',        generalTerm: 'finance work' },
  { key: 'bpo',             title: 'Customer Service / BPO',        generalTerm: 'bpo work' },
  { key: 'trades',          title: 'Skilled Trades',                generalTerm: 'skilled trades' },
  { key: 'labor',           title: 'General Labor',                 generalTerm: 'household work' },
  { key: 'public',          title: 'Public Service',                generalTerm: 'government work' },
  { key: 'other',           title: 'Other',                         generalTerm: 'other' },
]

const normalizeStr = (v) => String(v ?? '').toLowerCase().trim().replace(/\s+/g, ' ')

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * OccupationCombobox
 *
 * mode="classify" (default) → new 3-layer classification pipeline (Preferred Occupation step)
 * mode="catalog"            → classic catalog search (Work Experience, Admin forms)
 */
export default function OccupationCombobox({
  // Mode selector
  mode = 'classify',

  // Core props
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  placeholder,
  error,
  id,

  // Catalog-mode / legacy props (honored in catalog mode, no-op in classify mode)
  allowCustomFallback = false,
  generalizedOnly = false,
  broadFieldOnly = false,
  searchLimit = 20,
  minimumQueryLength = 2,

  // Deprecated / ignored props kept for backward-compat (no-op)
  enableAiSuggestions = false,     // eslint-disable-line no-unused-vars
  enableAiBroadField = false,      // eslint-disable-line no-unused-vars
  aiSuggestionProvider = null,     // eslint-disable-line no-unused-vars
}) {
  const isClassify = mode === 'classify'

  const values = useMemo(() => {
    if (multiple) return Array.isArray(selected) ? selected : []
    return selected ? [selected] : []
  }, [multiple, selected])

  const [query, setQuery]               = useState('')
  const [open, setOpen]                 = useState(false)
  const [loading, setLoading]           = useState(false)
  const [classifyResult, setClassifyResult] = useState(null)
  const [catalogOptions, setCatalogOptions] = useState([])
  const [instantOptions, setInstantOptions] = useState([])
  const [fallbackMode, setFallbackMode] = useState(false)
  const [highlighted, setHighlighted]   = useState(-1)
  const [searchError, setSearchError]   = useState(false)

  const inputRef    = useRef(null)
  const dropdownRef = useRef(null)
  const abortRef    = useRef(null)

  const normalizedQuery = query.trim()
  const canSelectMore   = values.length < limit

  const defaultPlaceholder = placeholder ?? (
    isClassify
      ? 'Type a job title (e.g. Teacher, Cashier, React Developer)'
      : 'Search by occupation title or code'
  )

  // ── Instant local results on every keystroke (classify mode) ──────────────
  useEffect(() => {
    if (!isClassify || normalizedQuery.length < minimumQueryLength) {
      setInstantOptions([])
      return
    }
    setInstantOptions(getInstantMatches(normalizedQuery))
  }, [isClassify, normalizedQuery, minimumQueryLength])

  // ── Debounced server request ───────────────────────────────────────────────
  useEffect(() => {
    if (!open || !canSelectMore || normalizedQuery.length < minimumQueryLength) {
      if (!isClassify) setCatalogOptions([])
      if (isClassify) setClassifyResult(null)
      setFallbackMode(false)
      return
    }

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    const cacheKey = `${mode}:${normalizedQuery}`
    const cached   = queryCache.get(cacheKey)

    if (cached) {
      setLoading(false)
      if (isClassify) {
        setClassifyResult(cached)
        setFallbackMode(cached.is_valid_job_input && !(cached.suggestions?.length))
      } else {
        setCatalogOptions(cached)
      }
      return
    }

    setLoading(true)
    setSearchError(false)

    const timer = setTimeout(async () => {
      try {
        if (isClassify) {
          const data = await classifyOccupation(normalizedQuery, 5, signal)
          if (signal.aborted) return
          putCache(cacheKey, data)
          setClassifyResult(data)
          setFallbackMode(data?.is_valid_job_input && !(data.suggestions?.length))
        } else {
          const modeParam = broadFieldOnly || generalizedOnly ? 'general' : 'catalog'
          const rows = await searchOccupations(normalizedQuery, searchLimit, modeParam, signal)
          if (signal.aborted) return
          putCache(cacheKey, rows)
          setCatalogOptions(rows)
        }
      } catch (err) {
        if (signal.aborted || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') return
        setSearchError(true)
        if (isClassify) setFallbackMode(true)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }, 250) // 250 ms debounce

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [normalizedQuery, open, canSelectMore, mode, isClassify, broadFieldOnly, generalizedOnly, searchLimit, minimumQueryLength])

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handleOutside = (e) => {
      const inside = inputRef.current?.contains(e.target) || dropdownRef.current?.contains(e.target)
      if (!inside) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // ── Merged suggestion list for keyboard nav ────────────────────────────────
  const allSuggestions = useMemo(() => {
    if (isClassify) {
      const serverSet = new Set((classifyResult?.suggestions ?? []).map((s) => normalizeStr(s.occupation_title)))
      const dedupedInstant = instantOptions.filter((s) => !serverSet.has(normalizeStr(s.occupation_title)))
      return [...(classifyResult?.suggestions ?? []), ...dedupedInstant]
    }
    return catalogOptions
  }, [isClassify, classifyResult, instantOptions, catalogOptions])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, allSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0 && allSuggestions[highlighted]) {
      e.preventDefault()
      handleSelect(allSuggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // ── Selection handlers ─────────────────────────────────────────────────────
  const handleSelect = useCallback((item) => {
    if (isClassify) {
      if (multiple) {
        const isDupe = values.some((v) => {
          if (item.is_fallback) return v.broad_field === item.broad_field
          
          const vTitle = normalizeStr(v.occupation_title)
          const iTitle = normalizeStr(item.occupation_title)
          
          if (!vTitle || !iTitle) return false
          return vTitle === iTitle
        })
        if (isDupe) return
      }
      const payload = {
        occupation_id:   item.occupation_id  || null,
        general_term:    item.general_term   || null,
        broad_field:     item.broad_field    || null,
        role_function:   item.role_function  || null,
        confidence:      item.confidence     ?? null,
        source:          item.source         || null,
        occupation_title: item.occupation_title,
        raw_job_title:   normalizedQuery,
        is_custom_pending: !item.occupation_id,
      }
      if (multiple) onChange([...values, payload].slice(0, limit))
      else onChange(payload)
    } else {
      // Catalog mode — preserve old object shape
      if (multiple) {
        const isDupe = values.some((v) => v.id === item.id)
        if (isDupe) return
        onChange([...values, item].slice(0, limit))
      } else {
        onChange(item)
      }
    }

    setQuery('')
    setClassifyResult(null)
    setCatalogOptions([])
    setInstantOptions([])
    setFallbackMode(false)
    setHighlighted(-1)
    setOpen(false)
  }, [isClassify, multiple, values, limit, onChange, normalizedQuery])

  const handleFallbackSelect = useCallback((field) => {
    handleSelect({
      occupation_title:  normalizedQuery || field.title,
      broad_field:       field.title,
      general_term:      field.generalTerm,
      role_function:     'General',
      confidence:        100,
      source:            'user_selected_broad_field',
      is_fallback:       true,
      occupation_id:     null,
    })
  }, [handleSelect, normalizedQuery])

  // ── Remove a chip ──────────────────────────────────────────────────────────
  const remove = (v, i) => {
    if (!multiple) return onChange(null)
    if (isClassify) return onChange(values.filter((_, idx) => idx !== i))
    return onChange(values.filter((val) => val.id !== v.id))
  }

  // ── Catalog custom fallback option ────────────────────────────────────────
  const customFallbackOption = useMemo(() => {
    if (!allowCustomFallback || isClassify || normalizedQuery.length < minimumQueryLength) return null
    const title  = normalizedQuery.replace(/\s+/g, ' ')
    const isDupe = [...values, ...catalogOptions].some((o) => normalizeStr(o.title ?? o.occupation_title) === normalizeStr(title))
    if (!title || isDupe) return null
    return { id: `custom:${normalizeStr(title)}`, title, raw_job_title: title, is_custom: true, source: 'manual' }
  }, [allowCustomFallback, isClassify, normalizedQuery, minimumQueryLength, values, catalogOptions])

  // ── Chip helpers ──────────────────────────────────────────────────────────
  const chipLabel = (v) => (isClassify ? v.occupation_title : v.title) ?? ''
  const chipBadge = (v) => (isClassify ? v.broad_field : (v.broad_category || v.general_term)) ?? ''

  // ── Should the dropdown be shown? ─────────────────────────────────────────
  const showDropdown = open && canSelectMore && normalizedQuery.length >= minimumQueryLength

  // ── Skeleton (classify mode, no results yet) ──────────────────────────────
  const showSkeleton = isClassify && loading && !instantOptions.length && !classifyResult

  return (
    <div className="relative">
      {/* ── Selected chips ── */}
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span
              key={isClassify ? i : (v.id ?? i)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1.5 pl-3 pr-2 text-xs font-bold text-blue-800"
            >
              <span className="truncate max-w-[120px]">{chipLabel(v)}</span>
              {chipBadge(v) && (
                <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-blue-700 max-w-[100px] truncate">
                  {chipBadge(v)}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(v, i)}
                aria-label={`Remove ${chipLabel(v)}`}
                className="shrink-0 rounded-full p-0.5 transition hover:bg-blue-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Input wrapper ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          ref={inputRef}
          id={id}
          value={query}
          onChange={(e) => {
            const val = e.target.value
            setQuery(val)
            setSearchError(false)
            setHighlighted(-1)
            if (val.trim().length < minimumQueryLength) {
              setClassifyResult(null)
              setCatalogOptions([])
              setInstantOptions([])
              setFallbackMode(false)
              setLoading(false)
            }
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Catalog mode: commit custom fallback on blur (e.g. Tab away)
            if (!isClassify && allowCustomFallback && !multiple && customFallbackOption) {
              setTimeout(() => handleSelect(customFallbackOption), 150)
            }
          }}
          disabled={!canSelectMore}
          placeholder={!canSelectMore ? `Maximum of ${limit} selected` : defaultPlaceholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          className={[
            'h-11 w-full rounded-lg border bg-white py-2.5 pl-9 pr-9 text-sm font-semibold outline-none transition',
            'focus:ring-2',
            error
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-400 focus:ring-blue-500/20',
            !canSelectMore && 'cursor-not-allowed bg-slate-50 opacity-60',
          ].filter(Boolean).join(' ')}
        />

        {/* Spinner — inside input, right side */}
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
        )}
      </div>

      {/* ── Dropdown — absolute, directly below input ── */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute left-0 top-full z-[200] mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl sm:min-w-[28rem] sm:max-w-[min(42rem,calc(100vw-4rem))]"
          onMouseDown={(e) => e.preventDefault()} // keeps input focused when clicking inside
        >
          {isClassify ? (
            <ClassifyContent
              query={normalizedQuery}
              loading={loading}
              result={classifyResult}
              instantOptions={instantOptions}
              fallbackMode={fallbackMode}
              highlighted={highlighted}
              broadFields={BROAD_FIELDS}
              onSelect={handleSelect}
              onFallbackSelect={handleFallbackSelect}
              showSkeleton={showSkeleton}
              searchError={searchError}
            />
          ) : (
            <CatalogContent
              loading={loading}
              options={catalogOptions}
              customFallback={customFallbackOption}
              highlighted={highlighted}
              query={normalizedQuery}
              minimumQueryLength={minimumQueryLength}
              onSelect={handleSelect}
              searchError={searchError}
            />
          )}
        </div>
      )}

      {/* ── Counter ── */}
      {multiple && (
        <p className="mt-1.5 text-xs text-slate-400">{values.length} of {limit} selected</p>
      )}
    </div>
  )
}

// ─── Classify Mode Dropdown ────────────────────────────────────────────────────

function ClassifyContent({
  query, loading, result, instantOptions, fallbackMode,
  highlighted, broadFields, onSelect, onFallbackSelect, showSkeleton, searchError,
}) {
  const serverSuggestions = result?.suggestions ?? []
  const serverTitles = new Set(serverSuggestions.map((s) => normalizeStr(s.occupation_title)))
  const dedupedInstant = instantOptions.filter((s) => !serverTitles.has(normalizeStr(s.occupation_title)))
  const totalItems = serverSuggestions.length + dedupedInstant.length

  return (
    <>
      {/* Invalid input banner */}
      {!loading && result && !result.is_valid_job_input && (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">Not a valid job input</p>
              <p className="mt-0.5 text-xs text-red-600">{result.invalid_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clarification banner (broad/ambiguous input) */}
      {!loading && result?.is_valid_job_input && result?.needs_clarification && serverSuggestions.length > 0 && !fallbackMode && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5">
          <div className="flex items-center gap-2 text-amber-800">
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-xs font-semibold">
              "{query}" could mean several jobs — select the closest match:
            </p>
          </div>
        </div>
      )}

      {/* Skeleton (loading, no instant results yet) */}
      {showSkeleton && (
        <div className="space-y-px py-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3.5 w-40 rounded bg-slate-100" />
                <div className="h-3.5 w-16 rounded bg-slate-100" />
              </div>
              <div className="flex gap-2">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instant (dictionary) suggestions — visible even while server loads */}
      {!fallbackMode && dedupedInstant.length > 0 && (
        <>
          {serverSuggestions.length === 0 && loading && (
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Instant matches
            </div>
          )}
          {dedupedInstant.map((item, i) => (
            <ClassifySuggestionRow
              key={`instant-${i}`}
              item={item}
              index={serverSuggestions.length + i}
              highlighted={highlighted}
              onSelect={onSelect}
            />
          ))}
        </>
      )}

      {/* Server suggestions */}
      {!fallbackMode && serverSuggestions.length > 0 && (
        <>
          {dedupedInstant.length > 0 && (
            <div className="border-y border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Best matches
            </div>
          )}
          {serverSuggestions.map((item, i) => (
            <ClassifySuggestionRow
              key={`server-${i}`}
              item={item}
              index={i}
              highlighted={highlighted}
              onSelect={onSelect}
            />
          ))}
        </>
      )}

      {/* Manual broad-field fallback */}
      {fallbackMode && !loading && (
        <>
          <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Could not identify the exact occupation.
                </p>
                <p className="mt-0.5 text-xs text-blue-600">
                  Select the closest broad field for <strong>"{query}"</strong>.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0.5 p-2">
            {broadFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFallbackSelect(field)}
                className="flex items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:outline-none"
              >
                {field.title}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !showSkeleton && !fallbackMode && totalItems === 0 && !(result && !result.is_valid_job_input) && (
        <p className="px-4 py-3 text-xs text-slate-500">
          No matching occupation found. Keep typing or{' '}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFallbackSelect(broadFields[broadFields.length - 1])}
            className="font-semibold text-blue-600 underline hover:no-underline"
          >
            select a broad field manually
          </button>.
        </p>
      )}

      {/* Network error note */}
      {searchError && !fallbackMode && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-amber-700">
          ⚠ Server unreachable — showing local results only.
        </p>
      )}
    </>
  )
}

// ─── Catalog Mode Dropdown ─────────────────────────────────────────────────────

function CatalogContent({ loading, options, customFallback, highlighted, query, minimumQueryLength, onSelect, searchError }) {
  return (
    <>
      {loading && options.length === 0 && (
        <div className="space-y-px py-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse px-4 py-3">
              <div className="mb-1.5 flex gap-2">
                <div className="h-3.5 w-36 rounded bg-slate-100" />
                <div className="h-3.5 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-3 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {options.map((item, i) => (
        <CatalogOptionRow
          key={item.id ?? i}
          item={item}
          index={i}
          highlighted={highlighted}
          onSelect={onSelect}
        />
      ))}

      {customFallback && (
        <>
          {options.length > 0 && <div className="border-t border-amber-100" />}
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Save as custom
          </div>
          <CatalogOptionRow
            item={customFallback}
            index={options.length}
            highlighted={highlighted}
            onSelect={onSelect}
          />
        </>
      )}

      {!loading && options.length === 0 && !customFallback && (
        <p className="px-4 py-3 text-xs text-slate-500">
          {query.length >= minimumQueryLength
            ? 'No matching occupation found. Try a different title or code.'
            : `Type ${minimumQueryLength - query.length} more character${minimumQueryLength - query.length !== 1 ? 's' : ''} to search.`}
        </p>
      )}

      {searchError && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-amber-700">
          ⚠ Search temporarily unavailable. Please try again.
        </p>
      )}
    </>
  )
}

// ─── Classify suggestion row ───────────────────────────────────────────────────

function ClassifySuggestionRow({ item, index, highlighted, onSelect }) {
  const isCatalog = item.source === 'catalog'
  const isDict    = item.source === 'dictionary'
  const isAi      = item.source === 'ai'

  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted === index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(item)}
      className={[
        'group flex w-full flex-col gap-1 border-b border-slate-50 px-4 py-3 text-left transition last:border-0',
        highlighted === index ? 'bg-blue-50' : 'hover:bg-slate-50/80',
      ].join(' ')}
    >
      {/* Title row */}
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold leading-snug text-slate-800">
            {item.occupation_title}
          </span>
        </div>
      </div>

      {/* Broad field + role row */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {item.broad_field && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">
            {item.broad_field}
          </span>
        )}
        {item.role_function && item.role_function !== 'General' && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{item.role_function}</span>
          </>
        )}
      </div>


    </button>
  )
}

// ─── Catalog option row ────────────────────────────────────────────────────────

function CatalogOptionRow({ item, index, highlighted, onSelect }) {
  const category = item.broad_category || item.category || item.general_term || ''

  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted === index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(item)}
      className={[
        'flex w-full items-start justify-between gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0',
        highlighted === index ? 'bg-blue-50' : 'hover:bg-slate-50/80',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800">{item.title}</span>
          {category && (
            <span className="max-w-[140px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {category}
            </span>
          )}
        </span>
        {item.matched_alias && (
          <span className="mt-0.5 block text-[11px] text-emerald-700">
            matches "{item.matched_alias}"
          </span>
        )}
        {item.matched_general_term && (
          <span className="mt-0.5 block text-[11px] text-violet-700">
            related to "{item.matched_general_term}"
          </span>
        )}
      </span>
    </button>
  )
}
