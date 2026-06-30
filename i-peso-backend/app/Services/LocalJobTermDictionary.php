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

        // ── HR ──
        [
            'triggers' => ['hr', 'human resources', 'recruiter', 'recruitment'],
            'suggestions' => [
                ['occupation_title' => 'Human Resource Officer', 'broad_field' => 'Human Resources and Recruitment', 'general_term' => 'human resources work', 'role_function' => 'HR / Recruitment', 'confidence' => 90, 'reason' => 'Human resources, hiring, and employee management.'],
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
