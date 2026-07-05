<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Local Philippine job-term dictionary for instant classification
 * before AI is invoked. Handles informal, Tagalog/English, slang,
 * abbreviated, and commonly misspelled job inputs.
 */
class LocalJobTermDictionary
{
    /**
     * Classify a raw job input against the local dictionary.
     *
     * @return array{is_valid_job_input: bool, needs_clarification: bool, suggestions: list<array>, invalid_reason: ?string}
     */
    public function classify(string $rawInput): array
    {
        $normalized = $this->normalize($rawInput);

        if ($normalized === '' || mb_strlen($normalized) < 2) {
            return $this->invalid('Please enter a job title.');
        }

        // Check invalid / too-vague inputs first
        if ($this->isInvalidInput($normalized)) {
            return $this->invalid('Please enter a specific job title so we can match you accurately.');
        }

        // Check the dictionary
        $matches = $this->findMatches($normalized);

        if (empty($matches)) {
            return [
                'is_valid_job_input' => true,
                'needs_clarification' => false,
                'suggestions' => [],
                'invalid_reason' => null,
            ];
        }

        $needsClarification = count($matches) > 2
            || collect($matches)->max('confidence') < 75;

        return [
            'is_valid_job_input' => true,
            'needs_clarification' => $needsClarification,
            'suggestions' => array_values(array_slice($matches, 0, 5)),
            'invalid_reason' => null,
        ];
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.\/ ]+/', ' ')
            ->squish()
            ->toString();
    }

    private function isInvalidInput(string $normalized): bool
    {
        $invalids = [
            'any job', 'any work', 'anything', 'kahit ano', 'kahit anong trabaho',
            'kahit na ano', 'any', 'wala', 'none', 'n/a', 'na', 'idk',
            'whatever', 'kung ano man', 'lahat', 'all jobs', 'all',
            'hindi ko alam', 'walang preference', 'pwede na kahit ano',
        ];

        return in_array($normalized, $invalids, true);
    }

    private function findMatches(string $normalized): array
    {
        $results = [];

        foreach (self::DICTIONARY as $entry) {
            foreach ($entry['triggers'] as $trigger) {
                if ($normalized === $trigger || Str::contains($normalized, $trigger)) {
                    foreach ($entry['suggestions'] as $suggestion) {
                        $key = Str::lower($suggestion['occupation_title']);
                        if (! isset($results[$key])) {
                            $results[$key] = array_merge($suggestion, ['source' => 'dictionary']);
                        }
                    }
                    break;
                }
            }
        }

        // Sort by confidence desc
        usort($results, fn (array $a, array $b) => $b['confidence'] <=> $a['confidence']);

        return $results;
    }

    private function invalid(string $reason): array
    {
        return [
            'is_valid_job_input' => false,
            'needs_clarification' => false,
            'suggestions' => [],
            'invalid_reason' => $reason,
        ];
    }

    private const DICTIONARY = [
        // ── Office & Admin ──
        [
            'triggers' => ['encoder', 'data encoder', 'data entry', 'mag e-encode'],
            'suggestions' => [
                ['occupation_title' => 'Data Encoder', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'Clerical / Data Entry', 'confidence' => 92, 'reason' => 'Commonly refers to clerical encoding or data entry work.'],
                ['occupation_title' => 'Office Clerk', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'General Office Support', 'confidence' => 78, 'reason' => 'Encoding is often part of general office clerk duties.'],
            ],
        ],
        [
            'triggers' => ['office staff', 'office work', 'admin staff', 'admin work', 'opisina'],
            'suggestions' => [
                ['occupation_title' => 'Office Clerk', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'General Office Support', 'confidence' => 90, 'reason' => 'General office support and administrative work.'],
                ['occupation_title' => 'Administrative Assistant', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'Administrative Support', 'confidence' => 85, 'reason' => 'May refer to an admin assistant role.'],
            ],
        ],
        [
            'triggers' => ['secretary', 'sekretarya'],
            'suggestions' => [
                ['occupation_title' => 'Secretary', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'Secretarial / Administrative', 'confidence' => 95, 'reason' => 'Direct match for secretarial work.'],
            ],
        ],
        [
            'triggers' => ['receptionist', 'front desk'],
            'suggestions' => [
                ['occupation_title' => 'Receptionist', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'Front Desk / Reception', 'confidence' => 95, 'reason' => 'Front desk and reception duties.'],
            ],
        ],

        // ── Retail & Sales ──
        [
            'triggers' => ['cashier', 'kahera', 'cashiering'],
            'suggestions' => [
                ['occupation_title' => 'Retail Cashier', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Cashiering', 'confidence' => 95, 'reason' => 'Cashiering at retail or commercial stores.'],
            ],
        ],
        [
            'triggers' => ['tindera', 'tindero', 'tingi', 'nagtitinda', 'sales lady', 'saleslady', 'sales girl'],
            'suggestions' => [
                ['occupation_title' => 'Sales Clerk', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Sales / Store Assistance', 'confidence' => 90, 'reason' => 'Local term for retail salesperson or store assistant.'],
                ['occupation_title' => 'Retail Salesperson', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Retail Sales', 'confidence' => 85, 'reason' => 'May refer to general retail sales work.'],
            ],
        ],
        [
            'triggers' => ['sales', 'sales agent', 'sales rep'],
            'suggestions' => [
                ['occupation_title' => 'Sales Agent', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Sales', 'confidence' => 88, 'reason' => 'Field or store-based sales work.'],
            ],
        ],

        // ── Food Service ──
        [
            'triggers' => ['service crew', 'crew', 'fast food', 'jollibee', 'mcdo', 'mcdonald'],
            'suggestions' => [
                ['occupation_title' => 'Food Service Crew', 'broad_field' => 'Food Service and Restaurants', 'general_term' => 'restaurant work', 'role_function' => 'Food Service', 'confidence' => 92, 'reason' => 'Service crew at fast food or restaurant establishments.'],
            ],
        ],
        [
            'triggers' => ['cook', 'chef', 'kusinero', 'kusinera', 'lutuin'],
            'suggestions' => [
                ['occupation_title' => 'Cook', 'broad_field' => 'Food Service and Restaurants', 'general_term' => 'restaurant work', 'role_function' => 'Cooking / Food Preparation', 'confidence' => 92, 'reason' => 'Cooking and food preparation work.'],
            ],
        ],
        [
            'triggers' => ['waiter', 'waitress', 'server'],
            'suggestions' => [
                ['occupation_title' => 'Waiter / Waitress', 'broad_field' => 'Food Service and Restaurants', 'general_term' => 'restaurant work', 'role_function' => 'Food Service', 'confidence' => 93, 'reason' => 'Restaurant or cafe table service.'],
            ],
        ],
        [
            'triggers' => ['barista', 'coffee'],
            'suggestions' => [
                ['occupation_title' => 'Barista', 'broad_field' => 'Food Service and Restaurants', 'general_term' => 'restaurant work', 'role_function' => 'Beverage Preparation', 'confidence' => 93, 'reason' => 'Coffee and beverage preparation.'],
            ],
        ],

        // ── BPO / Customer Service ──
        [
            'triggers' => ['call center', 'callcenter', 'contact center', 'csr'],
            'suggestions' => [
                ['occupation_title' => 'Customer Service Representative', 'broad_field' => 'BPO and Customer Service', 'general_term' => 'bpo work', 'role_function' => 'Customer Service', 'confidence' => 92, 'reason' => 'Call center or contact center customer service.'],
            ],
        ],
        [
            'triggers' => ['bpo', 'outsourcing'],
            'suggestions' => [
                ['occupation_title' => 'Customer Service Representative', 'broad_field' => 'BPO and Customer Service', 'general_term' => 'bpo work', 'role_function' => 'Customer Service', 'confidence' => 88, 'reason' => 'BPO typically refers to customer service or back-office work.'],
                ['occupation_title' => 'Technical Support Representative', 'broad_field' => 'BPO and Customer Service', 'general_term' => 'bpo work', 'role_function' => 'Technical Support', 'confidence' => 75, 'reason' => 'BPO may also refer to tech support roles.'],
            ],
        ],

        // ── Online / Digital ──
        [
            'triggers' => ['va', 'virtual assistant'],
            'suggestions' => [
                ['occupation_title' => 'Virtual Assistant', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'Remote Administrative Support', 'confidence' => 90, 'reason' => 'Online/remote administrative and support tasks.'],
            ],
        ],
        [
            'triggers' => ['social media', 'social media manager', 'smm', 'community manager'],
            'suggestions' => [
                ['occupation_title' => 'Social Media Specialist', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'Social Media Management', 'confidence' => 88, 'reason' => 'Managing social media accounts and content.'],
                ['occupation_title' => 'Digital Marketing Assistant', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Digital Marketing', 'confidence' => 72, 'reason' => 'May also refer to broader digital marketing tasks.'],
            ],
        ],
        [
            'triggers' => ['online seller', 'online selling', 'e-commerce', 'ecommerce'],
            'suggestions' => [
                ['occupation_title' => 'Online Seller', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'E-Commerce / Online Sales', 'confidence' => 88, 'reason' => 'Selling products or services online.'],
            ],
        ],
        [
            'triggers' => ['content creator', 'vlogger', 'youtuber', 'blogger'],
            'suggestions' => [
                ['occupation_title' => 'Content Creator', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'Content Creation', 'confidence' => 85, 'reason' => 'Creating digital content for online platforms.'],
            ],
        ],

        // ── IT / Computer ──
        [
            'triggers' => ['tech guy', 'techie', 'computer guy'],
            'suggestions' => [
                ['occupation_title' => 'IT Support Technician', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Technical Support', 'confidence' => 85, 'reason' => 'Commonly used for computer or IT support work.'],
                ['occupation_title' => 'Computer Technician', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Computer Repair and Maintenance', 'confidence' => 78, 'reason' => 'May refer to hardware repair or computer maintenance.'],
            ],
        ],
        [
            'triggers' => ['programmer', 'coder', 'coding'],
            'suggestions' => [
                ['occupation_title' => 'Software Developer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Software Development', 'confidence' => 90, 'reason' => 'Programming and software development work.'],
            ],
        ],
        [
            'triggers' => ['web dev', 'web developer', 'website'],
            'suggestions' => [
                ['occupation_title' => 'Web Developer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Web Development', 'confidence' => 93, 'reason' => 'Website design and development.'],
            ],
        ],
        [
            'triggers' => ['computer technician', 'pc technician', 'pc repair'],
            'suggestions' => [
                ['occupation_title' => 'Computer Technician', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Computer Repair and Maintenance', 'confidence' => 95, 'reason' => 'Computer hardware repair and troubleshooting.'],
            ],
        ],
        [
            'triggers' => ['it support', 'tech support', 'helpdesk', 'help desk'],
            'suggestions' => [
                ['occupation_title' => 'IT Support Technician', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Technical Support', 'confidence' => 93, 'reason' => 'IT helpdesk and technical support.'],
            ],
        ],

        // ── Driving & Delivery ──
        [
            'triggers' => ['driver', 'drayber', 'tsuper'],
            'suggestions' => [
                ['occupation_title' => 'Driver', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Driving / Transportation', 'confidence' => 88, 'reason' => 'Vehicle operation and driving work.'],
                ['occupation_title' => 'Delivery Driver', 'broad_field' => 'Delivery and Courier Work', 'general_term' => 'delivery work', 'role_function' => 'Delivery / Courier', 'confidence' => 75, 'reason' => 'May refer to delivery driving.'],
            ],
        ],
        [
            'triggers' => ['delivery rider', 'rider', 'grab', 'lalamove', 'food panda', 'foodpanda'],
            'suggestions' => [
                ['occupation_title' => 'Delivery Rider', 'broad_field' => 'Delivery and Courier Work', 'general_term' => 'delivery work', 'role_function' => 'Delivery / Courier', 'confidence' => 92, 'reason' => 'Motorcycle or bicycle delivery work.'],
            ],
        ],

        // ── Construction ──
        [
            'triggers' => ['construction worker', 'construction', 'konstraksyon'],
            'suggestions' => [
                ['occupation_title' => 'Construction Laborer', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'General Construction Labor', 'confidence' => 90, 'reason' => 'General construction site labor.'],
            ],
        ],
        [
            'triggers' => ['mason', 'kantero', 'tubero'],
            'suggestions' => [
                ['occupation_title' => 'Mason', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'Masonry', 'confidence' => 93, 'reason' => 'Bricklaying and masonry work.'],
            ],
        ],
        [
            'triggers' => ['carpenter', 'karpintero'],
            'suggestions' => [
                ['occupation_title' => 'Carpenter', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'Carpentry', 'confidence' => 95, 'reason' => 'Woodworking and carpentry.'],
            ],
        ],

        // ── Skilled Trades ──
        [
            'triggers' => ['welder', 'welding', 'smaw'],
            'suggestions' => [
                ['occupation_title' => 'Welder', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Welding', 'confidence' => 95, 'reason' => 'Metal welding and fabrication.'],
            ],
        ],
        [
            'triggers' => ['electrician', 'elektrisyan', 'electrical'],
            'suggestions' => [
                ['occupation_title' => 'Electrician', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Electrical Work', 'confidence' => 95, 'reason' => 'Electrical installation and repair.'],
            ],
        ],
        [
            'triggers' => ['plumber', 'tubero', 'plumbing'],
            'suggestions' => [
                ['occupation_title' => 'Plumber', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Plumbing', 'confidence' => 95, 'reason' => 'Plumbing installation and repair.'],
            ],
        ],
        [
            'triggers' => ['mechanic', 'mekaniko', 'auto repair', 'automotive'],
            'suggestions' => [
                ['occupation_title' => 'Automotive Mechanic', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Automotive Repair', 'confidence' => 92, 'reason' => 'Vehicle and engine repair work.'],
            ],
        ],
        [
            'triggers' => ['aircon', 'aircondition', 'hvac', 'refrigeration'],
            'suggestions' => [
                ['occupation_title' => 'Aircon / Refrigeration Technician', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'HVAC / Refrigeration', 'confidence' => 92, 'reason' => 'Aircon and refrigeration installation and repair.'],
            ],
        ],

        // ── Healthcare ──
        [
            'triggers' => ['caregiver', 'tagapag-alaga', 'care giver'],
            'suggestions' => [
                ['occupation_title' => 'Caregiver', 'broad_field' => 'Caregiving and Personal Care', 'general_term' => 'caregiver work', 'role_function' => 'Caregiving', 'confidence' => 95, 'reason' => 'Personal care and caregiving for elderly or patients.'],
            ],
        ],
        [
            'triggers' => ['nurse', 'nars', 'nursing'],
            'suggestions' => [
                ['occupation_title' => 'Registered Nurse', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Nursing', 'confidence' => 90, 'reason' => 'Professional nursing and healthcare.'],
            ],
        ],
        [
            'triggers' => ['nurse assistant', 'nursing aide', 'nursing assistant'],
            'suggestions' => [
                ['occupation_title' => 'Nursing Aide', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Healthcare Support', 'confidence' => 92, 'reason' => 'Assisting nurses in patient care.'],
            ],
        ],
        [
            'triggers' => ['midwife', 'komadrona', 'hilot'],
            'suggestions' => [
                ['occupation_title' => 'Midwife', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Midwifery', 'confidence' => 92, 'reason' => 'Maternal and newborn care.'],
            ],
        ],

        // ── Education ──
        [
            'triggers' => ['teacher', 'guro', 'titser', 'maestra', 'maestro', 'teaching'],
            'suggestions' => [
                ['occupation_title' => 'Teacher', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Teaching', 'confidence' => 93, 'reason' => 'Teaching in schools or institutions.'],
            ],
        ],
        [
            'triggers' => ['tutor', 'tutorial', 'tutoring'],
            'suggestions' => [
                ['occupation_title' => 'Tutor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Tutoring', 'confidence' => 90, 'reason' => 'One-on-one or group tutoring.'],
            ],
        ],

        // ── Creative / Design ──
        [
            'triggers' => ['graphic artist', 'graphic designer', 'graphics'],
            'suggestions' => [
                ['occupation_title' => 'Graphic Designer', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Graphic Design', 'confidence' => 92, 'reason' => 'Visual design and graphic arts work.'],
            ],
        ],
        [
            'triggers' => ['photographer', 'photo', 'litratista'],
            'suggestions' => [
                ['occupation_title' => 'Photographer', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Photography', 'confidence' => 90, 'reason' => 'Photography and photo editing.'],
            ],
        ],
        [
            'triggers' => ['video editor', 'videographer', 'video editing'],
            'suggestions' => [
                ['occupation_title' => 'Videographer / Video Editor', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Video Production', 'confidence' => 90, 'reason' => 'Video shooting and editing.'],
            ],
        ],

        // ── Finance ──
        [
            'triggers' => ['accountant', 'accounting', 'acountant', 'bookkeeper', 'bookkeeping'],
            'suggestions' => [
                ['occupation_title' => 'Accountant', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Accounting', 'confidence' => 93, 'reason' => 'Financial accounting and bookkeeping.'],
            ],
        ],

        // ── Security ──
        [
            'triggers' => ['security guard', 'guard', 'guwardiya', 'sekyu'],
            'suggestions' => [
                ['occupation_title' => 'Security Guard', 'broad_field' => 'Security and Protective Services', 'general_term' => 'security work', 'role_function' => 'Security / Protection', 'confidence' => 93, 'reason' => 'Security and property protection services.'],
            ],
        ],

        // ── Household ──
        [
            'triggers' => ['kasambahay', 'katulong', 'domestic helper', 'yaya', 'babysitter', 'nanny'],
            'suggestions' => [
                ['occupation_title' => 'Household Helper', 'broad_field' => 'Household and Domestic Services', 'general_term' => 'household work', 'role_function' => 'Domestic Service', 'confidence' => 92, 'reason' => 'Household cleaning, cooking, and childcare.'],
            ],
        ],
        [
            'triggers' => ['labandera', 'labandero', 'laundry'],
            'suggestions' => [
                ['occupation_title' => 'Laundry Worker', 'broad_field' => 'Household and Domestic Services', 'general_term' => 'household work', 'role_function' => 'Laundry Services', 'confidence' => 90, 'reason' => 'Laundry and ironing services.'],
            ],
        ],

        // ── Warehouse / Logistics ──
        [
            'triggers' => ['warehouse', 'bodegero', 'stock clerk', 'stockman'],
            'suggestions' => [
                ['occupation_title' => 'Warehouse Worker', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Warehouse Operations', 'confidence' => 90, 'reason' => 'Warehouse inventory and stock handling.'],
            ],
        ],
        [
            'triggers' => ['forklift', 'forklift operator'],
            'suggestions' => [
                ['occupation_title' => 'Forklift Operator', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Equipment Operation', 'confidence' => 93, 'reason' => 'Operating forklifts in warehouse or factory settings.'],
            ],
        ],

        // ── Factory ──
        [
            'triggers' => ['factory worker', 'factory', 'pabrika', 'production'],
            'suggestions' => [
                ['occupation_title' => 'Factory Worker', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Production / Assembly', 'confidence' => 90, 'reason' => 'Factory production and assembly line work.'],
            ],
        ],
        [
            'triggers' => ['machine operator', 'operator', 'sewing'],
            'suggestions' => [
                ['occupation_title' => 'Machine Operator', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Machine Operation', 'confidence' => 88, 'reason' => 'Operating machinery in manufacturing settings.'],
            ],
        ],

        // ── Beauty ──
        [
            'triggers' => ['barber', 'barbero', 'hairdresser', 'hair stylist', 'salon'],
            'suggestions' => [
                ['occupation_title' => 'Barber / Hairdresser', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Haircutting / Styling', 'confidence' => 92, 'reason' => 'Haircutting and hairstyling services.'],
            ],
        ],
        [
            'triggers' => ['massage', 'masahista', 'spa', 'massage therapist'],
            'suggestions' => [
                ['occupation_title' => 'Massage Therapist', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Wellness / Massage', 'confidence' => 90, 'reason' => 'Massage and spa therapy services.'],
            ],
        ],

        // ── Agriculture ──
        [
            'triggers' => ['farmer', 'magsasaka', 'farming', 'farm worker'],
            'suggestions' => [
                ['occupation_title' => 'Farm Worker', 'broad_field' => 'Agriculture and Farming', 'general_term' => 'agriculture work', 'role_function' => 'Farming / Crop Production', 'confidence' => 92, 'reason' => 'Agricultural farming and crop work.'],
            ],
        ],
        [
            'triggers' => ['fisherman', 'mangingisda', 'fishing'],
            'suggestions' => [
                ['occupation_title' => 'Fisherman', 'broad_field' => 'Fishing and Fish Processing', 'general_term' => 'fishing work', 'role_function' => 'Fishing', 'confidence' => 93, 'reason' => 'Fishing and fish harvesting.'],
            ],
        ],

        // ── Maritime ──
        [
            'triggers' => ['seaman', 'seafarer', 'sailor', 'marino'],
            'suggestions' => [
                ['occupation_title' => 'Seafarer', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Maritime / Seafaring', 'confidence' => 90, 'reason' => 'Shipboard work and maritime operations.'],
            ],
        ],

        // ── Hotel ──
        [
            'triggers' => ['housekeeping', 'room attendant', 'hotel'],
            'suggestions' => [
                ['occupation_title' => 'Room Attendant', 'broad_field' => 'Hospitality and Hotels', 'general_term' => 'hospitality work', 'role_function' => 'Housekeeping', 'confidence' => 90, 'reason' => 'Hotel housekeeping and room maintenance.'],
            ],
        ],

        // ── Engineering ──
        [
            'triggers' => ['engineer', 'inhinyero', 'engineering'],
            'suggestions' => [
                ['occupation_title' => 'Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Engineering', 'confidence' => 85, 'reason' => 'Engineering work. The specific discipline depends on specialization.'],
            ],
        ],
        [
            'triggers' => ['architect', 'arkitekto', 'architecture'],
            'suggestions' => [
                ['occupation_title' => 'Architect', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Architecture / Design', 'confidence' => 93, 'reason' => 'Architectural design and planning.'],
            ],
        ],

        // ── Education (expanded) ──
        [
            'triggers' => ['teacher', 'guro', 'titser', 'maestra', 'maestro', 'teaching', 'deped teacher', 'public school teacher'],
            'suggestions' => [
                ['occupation_title' => 'Teacher', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Teaching', 'confidence' => 93, 'reason' => 'Teaching in schools or institutions.'],
            ],
        ],
        [
            'triggers' => ['instructor', 'instruct'],
            'suggestions' => [
                ['occupation_title' => 'Instructor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Teaching / Instruction', 'confidence' => 92, 'reason' => 'Teaching or instructing students and trainees.'],
                ['occupation_title' => 'Trainer', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Training and Development', 'confidence' => 80, 'reason' => 'May also refer to a skills trainer or corporate trainer.'],
            ],
        ],
        [
            'triggers' => ['trainer', 'corporate trainer', 'skills trainer', 'job trainer', 'livelihood trainer', 'tesda trainer'],
            'suggestions' => [
                ['occupation_title' => 'Trainer', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Training and Development', 'confidence' => 90, 'reason' => 'Skills and knowledge training for employees or community.'],
            ],
        ],
        [
            'triggers' => ['professor', 'assoc. professor', 'associate professor', 'assistant professor'],
            'suggestions' => [
                ['occupation_title' => 'Professor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Academic Teaching', 'confidence' => 93, 'reason' => 'Teaching at college or university level.'],
            ],
        ],
        [
            'triggers' => ['lecturer', 'college lecturer', 'university lecturer'],
            'suggestions' => [
                ['occupation_title' => 'Lecturer', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Academic Teaching', 'confidence' => 92, 'reason' => 'Delivering lectures at academic institutions.'],
            ],
        ],
        [
            'triggers' => ['facilitator', 'workshop facilitator', 'learning facilitator', 'seminar facilitator'],
            'suggestions' => [
                ['occupation_title' => 'Facilitator', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Training / Facilitation', 'confidence' => 88, 'reason' => 'Facilitating workshops, seminars, or training sessions.'],
            ],
        ],
        [
            'triggers' => ['guidance counselor', 'school counselor', 'guidance teacher'],
            'suggestions' => [
                ['occupation_title' => 'Guidance Counselor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Guidance and Counseling', 'confidence' => 92, 'reason' => 'Providing academic and personal guidance to students.'],
            ],
        ],
        [
            'triggers' => ['school principal', 'principal', 'vice principal', 'school head', 'school director', 'school administrator'],
            'suggestions' => [
                ['occupation_title' => 'School Principal', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'School Administration', 'confidence' => 90, 'reason' => 'School leadership and administration.'],
            ],
        ],
        [
            'triggers' => ['librarian', 'school librarian', 'library aide', 'library staff'],
            'suggestions' => [
                ['occupation_title' => 'Librarian', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Library Services', 'confidence' => 90, 'reason' => 'Managing library collections and assisting patrons.'],
            ],
        ],
        [
            'triggers' => ['preschool teacher', 'kindergarten teacher', 'kinder teacher', 'daycare teacher', 'nursery teacher'],
            'suggestions' => [
                ['occupation_title' => 'Early Childhood Teacher', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Early Childhood Education', 'confidence' => 93, 'reason' => 'Teaching young children in preschool or daycare.'],
            ],
        ],
        [
            'triggers' => ['special education', 'sped teacher', 'special needs teacher', 'resource teacher'],
            'suggestions' => [
                ['occupation_title' => 'Special Education Teacher', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Special Education', 'confidence' => 93, 'reason' => 'Teaching students with special needs and disabilities.'],
            ],
        ],
        [
            'triggers' => ['tutor', 'tutorial', 'tutoring'],
            'suggestions' => [
                ['occupation_title' => 'Tutor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Tutoring', 'confidence' => 90, 'reason' => 'One-on-one or group tutoring.'],
            ],
        ],
        [
            'triggers' => ['online teacher', 'esl teacher', 'english teacher online', 'online english teacher'],
            'suggestions' => [
                ['occupation_title' => 'Online Teacher / ESL Tutor', 'broad_field' => 'Education and Teaching', 'general_term' => 'education work', 'role_function' => 'Online Teaching', 'confidence' => 90, 'reason' => 'Teaching English or other subjects online.'],
            ],
        ],

        // ── Healthcare (expanded) ──
        [
            'triggers' => ['doctor', 'physician', 'general practitioner', 'medical doctor', 'specialist doctor', 'internist', 'surgeon'],
            'suggestions' => [
                ['occupation_title' => 'Physician / Doctor', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Medical Practice', 'confidence' => 93, 'reason' => 'Medical diagnosis and patient care.'],
            ],
        ],
        [
            'triggers' => ['dentist', 'dental doctor', 'dmd', 'dds', 'dental surgeon', 'orthodontist'],
            'suggestions' => [
                ['occupation_title' => 'Dentist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Dentistry', 'confidence' => 95, 'reason' => 'Dental care and oral health.'],
            ],
        ],
        [
            'triggers' => ['pharmacist', 'pharmacy', 'drug store staff', 'pharmacy assistant', 'pharmacy technician'],
            'suggestions' => [
                ['occupation_title' => 'Pharmacist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Pharmacy', 'confidence' => 92, 'reason' => 'Dispensing medicines and pharmaceutical care.'],
            ],
        ],
        [
            'triggers' => ['medical technologist', 'med tech', 'medtech', 'laboratory technologist', 'clinical laboratory', 'lab technologist'],
            'suggestions' => [
                ['occupation_title' => 'Medical Technologist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Medical Laboratory', 'confidence' => 93, 'reason' => 'Clinical laboratory testing and analysis.'],
            ],
        ],
        [
            'triggers' => ['radiologic technologist', 'radtech', 'rad tech', 'x-ray tech', 'xray tech', 'radiographer'],
            'suggestions' => [
                ['occupation_title' => 'Radiologic Technologist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Radiology / Imaging', 'confidence' => 93, 'reason' => 'Operating imaging equipment for diagnostics.'],
            ],
        ],
        [
            'triggers' => ['physical therapist', 'physiotherapist', 'physical therapy', 'rehab therapist'],
            'suggestions' => [
                ['occupation_title' => 'Physical Therapist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Physical Therapy', 'confidence' => 93, 'reason' => 'Rehabilitation and physical therapy.'],
            ],
        ],
        [
            'triggers' => ['occupational therapist', 'ot therapist', 'occupational therapy'],
            'suggestions' => [
                ['occupation_title' => 'Occupational Therapist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Occupational Therapy', 'confidence' => 93, 'reason' => 'Helping patients perform daily activities.'],
            ],
        ],
        [
            'triggers' => ['speech therapist', 'speech pathologist', 'speech language', 'speech clinician'],
            'suggestions' => [
                ['occupation_title' => 'Speech Therapist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Speech Therapy', 'confidence' => 93, 'reason' => 'Treating speech, language, and communication disorders.'],
            ],
        ],
        [
            'triggers' => ['dietitian', 'nutritionist', 'registered nutritionist', 'nutrition officer'],
            'suggestions' => [
                ['occupation_title' => 'Dietitian / Nutritionist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Nutrition and Dietetics', 'confidence' => 92, 'reason' => 'Nutrition counseling and dietary planning.'],
            ],
        ],
        [
            'triggers' => ['psychologist', 'clinical psychologist', 'counseling psychologist'],
            'suggestions' => [
                ['occupation_title' => 'Psychologist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Psychology', 'confidence' => 92, 'reason' => 'Psychological assessment and mental health counseling.'],
            ],
        ],
        [
            'triggers' => ['paramedic', 'emt', 'emergency medical', 'ambulance staff'],
            'suggestions' => [
                ['occupation_title' => 'Paramedic / EMT', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Emergency Medical Services', 'confidence' => 92, 'reason' => 'Emergency pre-hospital medical care.'],
            ],
        ],
        [
            'triggers' => ['optometrist', 'optical assistant', 'optician', 'eye care specialist'],
            'suggestions' => [
                ['occupation_title' => 'Optometrist', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Optometry / Eye Care', 'confidence' => 90, 'reason' => 'Eye examination and vision care.'],
            ],
        ],
        [
            'triggers' => ['dental assistant', 'dental aide', 'dental technician', 'dental hygienist'],
            'suggestions' => [
                ['occupation_title' => 'Dental Assistant', 'broad_field' => 'Healthcare', 'general_term' => 'healthcare work', 'role_function' => 'Dental Support', 'confidence' => 90, 'reason' => 'Assisting dentists in procedures and patient care.'],
            ],
        ],

        // ── Engineering (expanded) ──
        [
            'triggers' => ['civil engineer', 'structural engineer', 'site engineer', 'civil engineering', 'geotechnical engineer'],
            'suggestions' => [
                ['occupation_title' => 'Civil Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Civil / Structural Engineering', 'confidence' => 95, 'reason' => 'Civil and structural engineering projects.'],
            ],
        ],
        [
            'triggers' => ['mechanical engineer', 'mechanical engineering'],
            'suggestions' => [
                ['occupation_title' => 'Mechanical Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Mechanical Engineering', 'confidence' => 95, 'reason' => 'Design and maintenance of mechanical systems.'],
            ],
        ],
        [
            'triggers' => ['electrical engineer', 'power engineer', 'electrical engineering'],
            'suggestions' => [
                ['occupation_title' => 'Electrical Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Electrical Engineering', 'confidence' => 95, 'reason' => 'Electrical systems design and installation.'],
            ],
        ],
        [
            'triggers' => ['electronics engineer', 'ece', 'electronics and communications', 'electronics engineering'],
            'suggestions' => [
                ['occupation_title' => 'Electronics Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Electronics Engineering', 'confidence' => 93, 'reason' => 'Electronics and communications engineering.'],
            ],
        ],
        [
            'triggers' => ['chemical engineer', 'chemical engineering', 'process engineer'],
            'suggestions' => [
                ['occupation_title' => 'Chemical Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Chemical Engineering', 'confidence' => 95, 'reason' => 'Chemical processes and plant engineering.'],
            ],
        ],
        [
            'triggers' => ['industrial engineer', 'industrial engineering'],
            'suggestions' => [
                ['occupation_title' => 'Industrial Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Industrial Engineering', 'confidence' => 95, 'reason' => 'Production efficiency and industrial systems.'],
            ],
        ],
        [
            'triggers' => ['environmental engineer', 'environmental scientist', 'environmental officer', 'pollution control officer'],
            'suggestions' => [
                ['occupation_title' => 'Environmental Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Environmental Engineering', 'confidence' => 92, 'reason' => 'Environmental compliance and sustainability.'],
            ],
        ],
        [
            'triggers' => ['geodetic engineer', 'land surveyor', 'surveyor', 'geodesy'],
            'suggestions' => [
                ['occupation_title' => 'Geodetic Engineer / Surveyor', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Geodesy / Surveying', 'confidence' => 93, 'reason' => 'Land surveying and mapping.'],
            ],
        ],
        [
            'triggers' => ['mining engineer', 'geological engineer', 'geologist', 'mining technician'],
            'suggestions' => [
                ['occupation_title' => 'Mining Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Mining Engineering', 'confidence' => 92, 'reason' => 'Mining operations and geological work.'],
            ],
        ],
        [
            'triggers' => ['draftsman', 'drafter', 'cad operator', 'autocad', 'revit', 'drafting'],
            'suggestions' => [
                ['occupation_title' => 'Draftsman / CAD Operator', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Technical Drawing / CAD', 'confidence' => 90, 'reason' => 'Technical drawing and CAD design work.'],
            ],
        ],
        [
            'triggers' => ['project engineer', 'quantity surveyor', 'cost estimator', 'estimator'],
            'suggestions' => [
                ['occupation_title' => 'Project / Cost Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Project / Cost Engineering', 'confidence' => 90, 'reason' => 'Project management and cost estimation.'],
            ],
        ],
        [
            'triggers' => ['safety officer', 'safety engineer', 'ohs officer', 'oshs officer', 'health and safety officer'],
            'suggestions' => [
                ['occupation_title' => 'Safety Officer (OHS)', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Occupational Safety', 'confidence' => 90, 'reason' => 'Workplace safety and compliance.'],
            ],
        ],
        [
            'triggers' => ['engineer', 'inhinyero', 'engineering'],
            'suggestions' => [
                ['occupation_title' => 'Engineer', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Engineering', 'confidence' => 85, 'reason' => 'Engineering work — discipline depends on specialization.'],
            ],
        ],
        [
            'triggers' => ['architect', 'arkitekto', 'architecture'],
            'suggestions' => [
                ['occupation_title' => 'Architect', 'broad_field' => 'Engineering and Architecture', 'general_term' => 'engineering work', 'role_function' => 'Architecture / Design', 'confidence' => 93, 'reason' => 'Architectural design and planning.'],
            ],
        ],

        // ── Construction (expanded) ──
        [
            'triggers' => ['painter', 'pintor', 'house painter', 'building painter'],
            'suggestions' => [
                ['occupation_title' => 'Painter', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'Painting', 'confidence' => 92, 'reason' => 'Surface painting of buildings and structures.'],
            ],
        ],
        [
            'triggers' => ['heavy equipment operator', 'crane operator', 'bulldozer operator', 'excavator operator', 'backhoe operator', 'payloader'],
            'suggestions' => [
                ['occupation_title' => 'Heavy Equipment Operator', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'Equipment Operation', 'confidence' => 92, 'reason' => 'Operating construction and earthmoving equipment.'],
            ],
        ],
        [
            'triggers' => ['construction foreman', 'site foreman', 'construction supervisor', 'site supervisor'],
            'suggestions' => [
                ['occupation_title' => 'Construction Foreman', 'broad_field' => 'Construction', 'general_term' => 'construction work', 'role_function' => 'Site Supervision', 'confidence' => 90, 'reason' => 'Supervising construction site workers and activities.'],
            ],
        ],

        // ── Skilled Trades (expanded) ──
        [
            'triggers' => ['electronics technician', 'electronics repair', 'appliance repair', 'electronic tech', 'cellphone repair'],
            'suggestions' => [
                ['occupation_title' => 'Electronics Technician', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Electronics Repair', 'confidence' => 90, 'reason' => 'Electronic device repair and maintenance.'],
            ],
        ],
        [
            'triggers' => ['motorcycle mechanic', 'motorbike mechanic', 'motorcycle repair'],
            'suggestions' => [
                ['occupation_title' => 'Motorcycle Mechanic', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Motorcycle Repair', 'confidence' => 90, 'reason' => 'Motorcycle maintenance and repair.'],
            ],
        ],
        [
            'triggers' => ['dressmaker', 'modista', 'tailor', 'seamstress', 'mananahi', 'sewing'],
            'suggestions' => [
                ['occupation_title' => 'Dressmaker / Tailor', 'broad_field' => 'Skilled Trades and Repair', 'general_term' => 'skilled trades', 'role_function' => 'Tailoring / Dressmaking', 'confidence' => 92, 'reason' => 'Clothing construction, alterations, and tailoring.'],
            ],
        ],

        // ── Marketing & Communications ──
        [
            'triggers' => ['marketing officer', 'marketing assistant', 'marketing coordinator', 'marketing executive', 'marketing staff'],
            'suggestions' => [
                ['occupation_title' => 'Marketing Officer', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Marketing', 'confidence' => 90, 'reason' => 'Marketing campaigns and brand promotion.'],
            ],
        ],
        [
            'triggers' => ['digital marketer', 'digital marketing', 'online marketing', 'digital marketing specialist'],
            'suggestions' => [
                ['occupation_title' => 'Digital Marketing Specialist', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Digital Marketing', 'confidence' => 90, 'reason' => 'Online and digital marketing campaigns.'],
            ],
        ],
        [
            'triggers' => ['seo specialist', 'seo analyst', 'search engine optimization', 'sem specialist'],
            'suggestions' => [
                ['occupation_title' => 'SEO / SEM Specialist', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Search Marketing', 'confidence' => 90, 'reason' => 'Search engine optimization and paid search.'],
            ],
        ],
        [
            'triggers' => ['content writer', 'copywriter', 'web content writer', 'technical writer', 'article writer', 'creative writer'],
            'suggestions' => [
                ['occupation_title' => 'Content Writer / Copywriter', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Content Writing', 'confidence' => 90, 'reason' => 'Writing content for websites, ads, and publications.'],
            ],
        ],
        [
            'triggers' => ['public relations', 'pr officer', 'communications officer', 'corporate communications'],
            'suggestions' => [
                ['occupation_title' => 'PR / Communications Officer', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Public Relations', 'confidence' => 88, 'reason' => 'Managing public image and communications.'],
            ],
        ],
        [
            'triggers' => ['brand manager', 'brand officer', 'brand marketing', 'product manager'],
            'suggestions' => [
                ['occupation_title' => 'Brand / Product Manager', 'broad_field' => 'Marketing and Communications', 'general_term' => 'marketing work', 'role_function' => 'Brand Management', 'confidence' => 88, 'reason' => 'Managing brands and product portfolios.'],
            ],
        ],

        // ── Finance (expanded) ──
        [
            'triggers' => ['auditor', 'internal auditor', 'external auditor', 'audit associate', 'financial auditor'],
            'suggestions' => [
                ['occupation_title' => 'Auditor', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Auditing', 'confidence' => 92, 'reason' => 'Financial auditing and compliance review.'],
            ],
        ],
        [
            'triggers' => ['financial analyst', 'finance analyst', 'budget analyst', 'financial planning'],
            'suggestions' => [
                ['occupation_title' => 'Financial Analyst', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Financial Analysis', 'confidence' => 90, 'reason' => 'Financial planning, budgeting, and analysis.'],
            ],
        ],
        [
            'triggers' => ['payroll officer', 'payroll specialist', 'payroll staff', 'payroll admin', 'payroll'],
            'suggestions' => [
                ['occupation_title' => 'Payroll Officer', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Payroll Processing', 'confidence' => 90, 'reason' => 'Employee payroll processing and computation.'],
            ],
        ],
        [
            'triggers' => ['credit analyst', 'credit officer', 'loan officer', 'loan processor', 'loans officer'],
            'suggestions' => [
                ['occupation_title' => 'Credit / Loans Officer', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Credit and Loans', 'confidence' => 90, 'reason' => 'Credit assessment and loan processing.'],
            ],
        ],
        [
            'triggers' => ['bank teller', 'bank clerk', 'bank officer', 'banking staff', 'remittance officer'],
            'suggestions' => [
                ['occupation_title' => 'Bank Teller / Clerk', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Banking Services', 'confidence' => 90, 'reason' => 'Banking transactions and customer service.'],
            ],
        ],
        [
            'triggers' => ['insurance agent', 'insurance advisor', 'insurance sales', 'insurance representative'],
            'suggestions' => [
                ['occupation_title' => 'Insurance Agent', 'broad_field' => 'Accounting and Finance', 'general_term' => 'finance work', 'role_function' => 'Insurance Sales', 'confidence' => 88, 'reason' => 'Selling insurance products to clients.'],
            ],
        ],

        // ── HR (expanded) ──
        [
            'triggers' => ['hr', 'human resources', 'recruiter', 'recruitment'],
            'suggestions' => [
                ['occupation_title' => 'Human Resource Officer', 'broad_field' => 'Human Resources and Recruitment', 'general_term' => 'human resources work', 'role_function' => 'HR / Recruitment', 'confidence' => 90, 'reason' => 'Human resources, hiring, and employee management.'],
            ],
        ],
        [
            'triggers' => ['training officer', 'learning and development', 'hr trainer', 'organizational development', 'od officer'],
            'suggestions' => [
                ['occupation_title' => 'Training Officer', 'broad_field' => 'Human Resources and Recruitment', 'general_term' => 'human resources work', 'role_function' => 'Training and Development', 'confidence' => 90, 'reason' => 'Employee training and organizational development.'],
            ],
        ],
        [
            'triggers' => ['compensation and benefits', 'benefits officer', 'employee benefits', 'hris officer'],
            'suggestions' => [
                ['occupation_title' => 'Compensation & Benefits Officer', 'broad_field' => 'Human Resources and Recruitment', 'general_term' => 'human resources work', 'role_function' => 'Compensation and Benefits', 'confidence' => 90, 'reason' => 'Managing employee compensation and benefits.'],
            ],
        ],
        [
            'triggers' => ['employee relations', 'labor relations', 'industrial relations', 'labor compliance'],
            'suggestions' => [
                ['occupation_title' => 'Employee / Labor Relations Officer', 'broad_field' => 'Human Resources and Recruitment', 'general_term' => 'human resources work', 'role_function' => 'Employee Relations', 'confidence' => 88, 'reason' => 'Managing labor relations and employee issues.'],
            ],
        ],

        // ── Security (expanded) ──
        [
            'triggers' => ['police', 'pulis', 'pnp', 'police officer', 'law enforcement', 'patrolman', 'detective'],
            'suggestions' => [
                ['occupation_title' => 'Police Officer', 'broad_field' => 'Security and Protective Services', 'general_term' => 'security work', 'role_function' => 'Law Enforcement', 'confidence' => 90, 'reason' => 'Law enforcement and public safety.'],
            ],
        ],
        [
            'triggers' => ['firefighter', 'fire fighter', 'bfp', 'fire officer', 'fire marshall'],
            'suggestions' => [
                ['occupation_title' => 'Firefighter', 'broad_field' => 'Security and Protective Services', 'general_term' => 'security work', 'role_function' => 'Fire Fighting', 'confidence' => 92, 'reason' => 'Fire suppression and emergency response.'],
            ],
        ],
        [
            'triggers' => ['cctv operator', 'cctv technician', 'surveillance officer', 'cctv installer'],
            'suggestions' => [
                ['occupation_title' => 'CCTV / Surveillance Operator', 'broad_field' => 'Security and Protective Services', 'general_term' => 'security work', 'role_function' => 'Surveillance', 'confidence' => 90, 'reason' => 'CCTV monitoring and surveillance operations.'],
            ],
        ],

        // ── Driving (expanded) ──
        [
            'triggers' => ['bus driver', 'truck driver', 'ten-wheeler', '10-wheeler', 'trailer driver'],
            'suggestions' => [
                ['occupation_title' => 'Bus / Truck Driver', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Commercial Vehicle Driving', 'confidence' => 90, 'reason' => 'Driving buses or commercial trucks.'],
            ],
        ],
        [
            'triggers' => ['tricycle driver', 'trike driver', 'jeepney driver', 'uv express driver'],
            'suggestions' => [
                ['occupation_title' => 'Light Transport Driver', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Public Transport', 'confidence' => 88, 'reason' => 'Driving light public transport vehicles.'],
            ],
        ],
        [
            'triggers' => ['grab driver', 'tnvs driver', 'angkas driver', 'ride share'],
            'suggestions' => [
                ['occupation_title' => 'TNVS / Taxi Driver', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Ride-Hailing / Taxi', 'confidence' => 88, 'reason' => 'Ride-hailing and taxi driving.'],
            ],
        ],
        [
            'triggers' => ['flight attendant', 'cabin crew', 'airline staff', 'stewardess'],
            'suggestions' => [
                ['occupation_title' => 'Flight Attendant / Cabin Crew', 'broad_field' => 'Driving and Transportation', 'general_term' => 'driver', 'role_function' => 'Aviation / Air Crew', 'confidence' => 93, 'reason' => 'In-flight passenger service and safety.'],
            ],
        ],

        // ── Logistics (expanded) ──
        [
            'triggers' => ['logistics officer', 'logistics coordinator', 'supply chain officer', 'logistics manager'],
            'suggestions' => [
                ['occupation_title' => 'Logistics Officer', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Logistics', 'confidence' => 90, 'reason' => 'Managing logistics, transport, and supply chains.'],
            ],
        ],
        [
            'triggers' => ['procurement officer', 'purchasing officer', 'buyer', 'purchasing staff', 'purchasing agent'],
            'suggestions' => [
                ['occupation_title' => 'Procurement / Purchasing Officer', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Procurement', 'confidence' => 90, 'reason' => 'Purchasing goods and services for the organization.'],
            ],
        ],
        [
            'triggers' => ['inventory officer', 'inventory manager', 'inventory controller', 'stock controller'],
            'suggestions' => [
                ['occupation_title' => 'Inventory Officer', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Inventory Management', 'confidence' => 90, 'reason' => 'Managing stock and inventory records.'],
            ],
        ],
        [
            'triggers' => ['customs broker', 'freight forwarder', 'import export', 'shipping officer', 'cargo officer'],
            'suggestions' => [
                ['occupation_title' => 'Customs Broker / Freight Forwarder', 'broad_field' => 'Warehouse and Logistics', 'general_term' => 'logistics work', 'role_function' => 'Customs and Freight', 'confidence' => 90, 'reason' => 'Customs clearance and cargo forwarding.'],
            ],
        ],

        // ── Manufacturing (expanded) ──
        [
            'triggers' => ['assembler', 'assembly worker', 'line assembler', 'assembly line worker'],
            'suggestions' => [
                ['occupation_title' => 'Assembler', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Assembly', 'confidence' => 90, 'reason' => 'Assembling products on factory assembly lines.'],
            ],
        ],
        [
            'triggers' => ['quality control', 'qc inspector', 'quality inspector', 'production inspector', 'qa inspector'],
            'suggestions' => [
                ['occupation_title' => 'Quality Control Inspector', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Quality Control', 'confidence' => 90, 'reason' => 'Inspecting products for quality standards.'],
            ],
        ],
        [
            'triggers' => ['garment worker', 'sewist', 'sewing machine operator', 'textile worker'],
            'suggestions' => [
                ['occupation_title' => 'Garment / Textile Worker', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Garment Production', 'confidence' => 90, 'reason' => 'Garment and textile manufacturing work.'],
            ],
        ],

        // ── Beauty (expanded) ──
        [
            'triggers' => ['nail technician', 'nail artist', 'nail tech', 'manicurist', 'pedicurist'],
            'suggestions' => [
                ['occupation_title' => 'Nail Technician', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Nail Care', 'confidence' => 92, 'reason' => 'Nail care, manicure, and pedicure services.'],
            ],
        ],
        [
            'triggers' => ['aesthetician', 'esthetician', 'skincare specialist', 'facialist', 'derma therapist'],
            'suggestions' => [
                ['occupation_title' => 'Aesthetician / Skincare Specialist', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Skincare / Aesthetics', 'confidence' => 90, 'reason' => 'Facial treatments and skincare services.'],
            ],
        ],
        [
            'triggers' => ['fitness instructor', 'gym trainer', 'personal trainer', 'gym instructor', 'yoga instructor', 'aerobics instructor'],
            'suggestions' => [
                ['occupation_title' => 'Fitness Instructor / Personal Trainer', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Fitness Training', 'confidence' => 90, 'reason' => 'Fitness coaching and personal training.'],
            ],
        ],
        [
            'triggers' => ['makeup artist', 'mua', 'bridal makeup', 'event makeup'],
            'suggestions' => [
                ['occupation_title' => 'Makeup Artist', 'broad_field' => 'Beauty and Wellness', 'general_term' => 'beauty work', 'role_function' => 'Makeup / Cosmetology', 'confidence' => 92, 'reason' => 'Professional makeup application for events.'],
            ],
        ],

        // ── Hospitality (expanded) ──
        [
            'triggers' => ['hotel front desk', 'hotel receptionist', 'hotel front office', 'guest relations', 'concierge', 'bellman', 'hotel staff'],
            'suggestions' => [
                ['occupation_title' => 'Hotel Front Office Staff', 'broad_field' => 'Hospitality and Hotels', 'general_term' => 'hospitality work', 'role_function' => 'Front Office / Guest Services', 'confidence' => 90, 'reason' => 'Hotel front desk and guest service operations.'],
            ],
        ],
        [
            'triggers' => ['event coordinator', 'events coordinator', 'event planner', 'wedding coordinator', 'wedding planner', 'catering coordinator'],
            'suggestions' => [
                ['occupation_title' => 'Event Coordinator', 'broad_field' => 'Hospitality and Hotels', 'general_term' => 'hospitality work', 'role_function' => 'Events / Catering', 'confidence' => 90, 'reason' => 'Planning and coordinating events and weddings.'],
            ],
        ],
        [
            'triggers' => ['tour guide', 'travel guide', 'tourism officer', 'travel agent', 'travel consultant', 'ticketing officer'],
            'suggestions' => [
                ['occupation_title' => 'Tour Guide / Travel Agent', 'broad_field' => 'Hospitality and Hotels', 'general_term' => 'hospitality work', 'role_function' => 'Tourism / Travel', 'confidence' => 88, 'reason' => 'Tourism guiding and travel booking.'],
            ],
        ],
        [
            'triggers' => ['flight attendant', 'cabin crew', 'airline staff', 'stewardess'],
            'suggestions' => [
                ['occupation_title' => 'Flight Attendant / Cabin Crew', 'broad_field' => 'Hospitality and Hotels', 'general_term' => 'hospitality work', 'role_function' => 'Aviation / Air Crew', 'confidence' => 93, 'reason' => 'Providing in-flight service and safety.'],
            ],
        ],

        // ── IT (expanded) ──
        [
            'triggers' => ['network engineer', 'network admin', 'network administrator', 'network technician', 'cisco', 'ccna'],
            'suggestions' => [
                ['occupation_title' => 'Network Engineer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Network Administration', 'confidence' => 92, 'reason' => 'Network infrastructure design and management.'],
            ],
        ],
        [
            'triggers' => ['system admin', 'sysadmin', 'systems administrator', 'it admin', 'server admin'],
            'suggestions' => [
                ['occupation_title' => 'System Administrator', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Systems Administration', 'confidence' => 92, 'reason' => 'Managing servers and IT systems.'],
            ],
        ],
        [
            'triggers' => ['data analyst', 'data analysis', 'business analyst it', 'bi analyst', 'power bi', 'business intelligence'],
            'suggestions' => [
                ['occupation_title' => 'Data Analyst', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Data Analysis', 'confidence' => 90, 'reason' => 'Data analysis and business intelligence.'],
            ],
        ],
        [
            'triggers' => ['data scientist', 'machine learning', 'ml engineer', 'ai engineer', 'artificial intelligence'],
            'suggestions' => [
                ['occupation_title' => 'Data Scientist / ML Engineer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Data Science / AI', 'confidence' => 90, 'reason' => 'Machine learning and data science.'],
            ],
        ],
        [
            'triggers' => ['cybersecurity', 'cyber security', 'information security', 'infosec', 'penetration test'],
            'suggestions' => [
                ['occupation_title' => 'Cybersecurity Analyst', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Cybersecurity', 'confidence' => 90, 'reason' => 'Network and information security.'],
            ],
        ],
        [
            'triggers' => ['cloud engineer', 'cloud architect', 'aws engineer', 'azure engineer', 'devops', 'cloud computing'],
            'suggestions' => [
                ['occupation_title' => 'Cloud / DevOps Engineer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Cloud / DevOps', 'confidence' => 90, 'reason' => 'Cloud infrastructure and DevOps engineering.'],
            ],
        ],
        [
            'triggers' => ['qa engineer', 'quality assurance engineer', 'software tester', 'test engineer', 'automation tester'],
            'suggestions' => [
                ['occupation_title' => 'QA Engineer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'Software Quality Assurance', 'confidence' => 90, 'reason' => 'Software quality testing and assurance.'],
            ],
        ],
        [
            'triggers' => ['ui ux', 'ux designer', 'ui designer', 'user experience', 'product designer'],
            'suggestions' => [
                ['occupation_title' => 'UI/UX Designer', 'broad_field' => 'IT and Computer Work', 'general_term' => 'it work', 'role_function' => 'UI/UX Design', 'confidence' => 90, 'reason' => 'User interface and experience design.'],
            ],
        ],

        // ── Legal ──
        [
            'triggers' => ['lawyer', 'attorney', 'abogado', 'barrister', 'litigator', 'public attorney', 'atty', 'legal counsel'],
            'suggestions' => [
                ['occupation_title' => 'Lawyer / Attorney', 'broad_field' => 'Legal and Justice', 'general_term' => 'legal work', 'role_function' => 'Legal Practice', 'confidence' => 95, 'reason' => 'Legal representation and counsel.'],
            ],
        ],
        [
            'triggers' => ['paralegal', 'legal assistant', 'legal secretary', 'legal staff', 'legal officer'],
            'suggestions' => [
                ['occupation_title' => 'Paralegal / Legal Assistant', 'broad_field' => 'Legal and Justice', 'general_term' => 'legal work', 'role_function' => 'Legal Support', 'confidence' => 92, 'reason' => 'Assisting lawyers and legal professionals.'],
            ],
        ],
        [
            'triggers' => ['notary public', 'clerk of court', 'court employee', 'judiciary staff'],
            'suggestions' => [
                ['occupation_title' => 'Notary / Court Staff', 'broad_field' => 'Legal and Justice', 'general_term' => 'legal work', 'role_function' => 'Notarial / Court Services', 'confidence' => 90, 'reason' => 'Court services and notarial work.'],
            ],
        ],

        // ── Government & Social Services ──
        [
            'triggers' => ['government employee', 'civil servant', 'government worker', 'public servant', 'lgu employee', 'city hall employee', 'government staff'],
            'suggestions' => [
                ['occupation_title' => 'Government Employee', 'broad_field' => 'Public Administration', 'general_term' => 'government work', 'role_function' => 'Government Service', 'confidence' => 85, 'reason' => 'Working for a government agency or LGU.'],
            ],
        ],
        [
            'triggers' => ['barangay official', 'barangay captain', 'barangay secretary', 'barangay treasurer', 'barangay kagawad', 'barangay tanod'],
            'suggestions' => [
                ['occupation_title' => 'Barangay Official / Staff', 'broad_field' => 'Public Administration', 'general_term' => 'government work', 'role_function' => 'Barangay Governance', 'confidence' => 90, 'reason' => 'Serving in barangay government offices.'],
            ],
        ],
        [
            'triggers' => ['social worker', 'case worker', 'family welfare worker', 'dswd worker', 'child welfare', 'community development'],
            'suggestions' => [
                ['occupation_title' => 'Social Worker', 'broad_field' => 'Public Administration', 'general_term' => 'government work', 'role_function' => 'Social Welfare', 'confidence' => 90, 'reason' => 'Providing social welfare and community services.'],
            ],
        ],
        [
            'triggers' => ['military', 'soldier', 'sundalo', 'army', 'navy', 'air force', 'afp', 'coast guard'],
            'suggestions' => [
                ['occupation_title' => 'Military Personnel', 'broad_field' => 'Armed Forces and Defense', 'general_term' => 'military work', 'role_function' => 'Military Service', 'confidence' => 90, 'reason' => 'Service in the armed forces.'],
            ],
        ],

        // ── Agriculture (expanded) ──
        [
            'triggers' => ['livestock farmer', 'pig farmer', 'hog raiser', 'poultry farmer', 'chicken farmer', 'animal husbandry'],
            'suggestions' => [
                ['occupation_title' => 'Livestock / Poultry Farmer', 'broad_field' => 'Agriculture and Farming', 'general_term' => 'agriculture work', 'role_function' => 'Livestock Farming', 'confidence' => 90, 'reason' => 'Raising livestock and poultry for food.'],
            ],
        ],

        // ── Retail (expanded) ──
        [
            'triggers' => ['merchandiser', 'product merchandiser', 'trade merchandiser', 'retail merchandiser'],
            'suggestions' => [
                ['occupation_title' => 'Merchandiser', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Merchandising', 'confidence' => 90, 'reason' => 'Arranging and promoting products in stores.'],
            ],
        ],
        [
            'triggers' => ['promodizer', 'promoter', 'product demonstrator', 'brand promoter', 'in-store promoter'],
            'suggestions' => [
                ['occupation_title' => 'Promodizer / Promoter', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Product Promotion', 'confidence' => 88, 'reason' => 'In-store product promotion and demonstration.'],
            ],
        ],
        [
            'triggers' => ['medical representative', 'med rep', 'pharma rep', 'pharmaceutical rep', 'detailer'],
            'suggestions' => [
                ['occupation_title' => 'Medical Representative', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Medical Sales', 'confidence' => 90, 'reason' => 'Promoting pharmaceutical products to medical professionals.'],
            ],
        ],
        [
            'triggers' => ['real estate agent', 'property agent', 'real estate broker', 'property broker', 'property sales'],
            'suggestions' => [
                ['occupation_title' => 'Real Estate Agent', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Real Estate Sales', 'confidence' => 88, 'reason' => 'Selling or renting real estate properties.'],
            ],
        ],

        // ── Creative (expanded) ──
        [
            'triggers' => ['animator', '2d animator', '3d animator', 'motion graphics', 'animation'],
            'suggestions' => [
                ['occupation_title' => 'Animator / Motion Designer', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Animation', 'confidence' => 90, 'reason' => 'Creating animation and motion graphics.'],
            ],
        ],
        [
            'triggers' => ['journalist', 'reporter', 'news writer', 'editor media', 'proofreader'],
            'suggestions' => [
                ['occupation_title' => 'Journalist / Editor', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Journalism / Editorial', 'confidence' => 88, 'reason' => 'Writing and editing news and editorial content.'],
            ],
        ],
        [
            'triggers' => ['fashion designer', 'clothing designer', 'costume designer', 'wardrobe stylist'],
            'suggestions' => [
                ['occupation_title' => 'Fashion Designer', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Fashion Design', 'confidence' => 88, 'reason' => 'Designing clothing and fashion items.'],
            ],
        ],
        [
            'triggers' => ['broadcaster', 'radio announcer', 'tv host', 'news anchor', 'emcee', 'on-air'],
            'suggestions' => [
                ['occupation_title' => 'Broadcaster / Media Personality', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Broadcasting / Media', 'confidence' => 88, 'reason' => 'On-air broadcasting and media personality.'],
            ],
        ],

        // ── AMBIGUOUS — needs_clarification ──
        [
            'triggers' => ['manager'],
            'suggestions' => [
                ['occupation_title' => 'Office Manager', 'broad_field' => 'Management and Business Operations', 'general_term' => 'management work', 'role_function' => 'Office Management', 'confidence' => 60, 'reason' => 'May refer to office or general business management.'],
                ['occupation_title' => 'Sales Manager', 'broad_field' => 'Retail and Store Work', 'general_term' => 'retail work', 'role_function' => 'Sales Management', 'confidence' => 55, 'reason' => 'May refer to sales team management.'],
                ['occupation_title' => 'Restaurant Manager', 'broad_field' => 'Food Service and Restaurants', 'general_term' => 'restaurant work', 'role_function' => 'Restaurant Management', 'confidence' => 50, 'reason' => 'May refer to restaurant or food establishment management.'],
                ['occupation_title' => 'Operations Manager', 'broad_field' => 'Management and Business Operations', 'general_term' => 'management work', 'role_function' => 'Operations Management', 'confidence' => 50, 'reason' => 'May refer to general business operations management.'],
            ],
        ],
        [
            'triggers' => ['freelancer', 'freelance', 'freelancing'],
            'suggestions' => [
                ['occupation_title' => 'Virtual Assistant', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'Remote Administrative Support', 'confidence' => 55, 'reason' => 'Freelancing often involves VA or admin tasks.'],
                ['occupation_title' => 'Graphic Designer', 'broad_field' => 'Media Arts and Design', 'general_term' => 'creative work', 'role_function' => 'Graphic Design', 'confidence' => 50, 'reason' => 'Freelancing is common in design and creative fields.'],
                ['occupation_title' => 'Content Creator', 'broad_field' => 'Online and Digital Work', 'general_term' => 'online work', 'role_function' => 'Content Creation', 'confidence' => 48, 'reason' => 'Freelancing may involve content writing or creation.'],
            ],
        ],
        [
            'triggers' => ['supervisor'],
            'suggestions' => [
                ['occupation_title' => 'Production Supervisor', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Supervision', 'confidence' => 55, 'reason' => 'May refer to factory or production supervision.'],
                ['occupation_title' => 'Office Supervisor', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'Office Supervision', 'confidence' => 52, 'reason' => 'May refer to office team supervision.'],
            ],
        ],
        [
            'triggers' => ['staff', 'trabahante', 'empleyado', 'worker'],
            'suggestions' => [
                ['occupation_title' => 'Office Clerk', 'broad_field' => 'Office and Administration', 'general_term' => 'office work', 'role_function' => 'General Office Support', 'confidence' => 50, 'reason' => 'Generic term — may refer to office or admin work.'],
                ['occupation_title' => 'Factory Worker', 'broad_field' => 'Manufacturing and Factory Work', 'general_term' => 'factory worker', 'role_function' => 'Production / Assembly', 'confidence' => 45, 'reason' => 'Generic term — may refer to factory or manual work.'],
            ],
        ],
    ];
}
