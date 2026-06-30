<?php

namespace Database\Seeders;

use App\Models\Employer;
use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\Occupation;
use App\Models\SeekerDisability;
use App\Models\SeekerEducation;
use App\Models\SeekerEligibility;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use App\Models\SeekerSkill;
use App\Models\SeekerTraining;
use App\Models\SeekerWorkExperience;
use App\Models\SeekerWorkLocation;
use App\Models\Application;
use App\Models\InterviewSchedule;
use App\Services\MatchingProfileService;
use App\Services\SkillTaxonomyService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoDashboardSeeder extends Seeder
{
    private const PASSWORD = 'Password123!';
    private const SEEKER_EMAIL = 'demo.seeker@ipeso.test';
    private const SEEKER_NURSE = 'maria.clara@ipeso.test';
    private const SEEKER_IT = 'jose.rizal@ipeso.test';
    private const SEEKER_DRIVER = 'andres.bonifacio@ipeso.test';
    private const SEEKER_HR = 'gabriela.silang@ipeso.test';

    private const PRIMARY_EMPLOYER_EMAIL = 'demo.employer@ipeso.test';
    private const SECONDARY_EMPLOYER_EMAIL = 'demo.employer2@ipeso.test';
    private const HOSPITAL_EMPLOYER_EMAIL = 'hr@urdanetahospital.test';
    private const TECH_EMPLOYER_EMAIL = 'careers@pangasinantech.test';
    private const CONST_EMPLOYER_EMAIL = 'jobs@goldenharvest.test';

    private array $columnCache = [];

    public function run(): void
    {
        $occupations = $this->seedOccupations();
        $employers = $this->seedEmployers();
        $seekers = $this->seedSeekers();

        foreach ($seekers as $seekerData) {
            $this->seedSeekerProfileRows($seekerData['model'], $occupations, $seekerData['profile']);
        }
        
        $vacancies = $this->seedVacancies($employers, $occupations);
        
        foreach ($seekers as $seekerData) {
            $this->syncMatchingData($seekerData['model'], $vacancies);
        }

        $this->seedApplications($seekers, $vacancies, $employers);

        $this->command?->info('Demo dashboard data is ready.');
        $this->command?->line('Seeker 1 (Admin/CS): '.self::SEEKER_EMAIL.' / '.self::PASSWORD);
        $this->command?->line('Seeker 2 (Nurse): '.self::SEEKER_NURSE.' / '.self::PASSWORD);
        $this->command?->line('Seeker 3 (IT): '.self::SEEKER_IT.' / '.self::PASSWORD);
        $this->command?->line('Employer 1 (BPO): '.self::PRIMARY_EMPLOYER_EMAIL.' / '.self::PASSWORD);
        $this->command?->line('Employer 2 (Tech): '.self::TECH_EMPLOYER_EMAIL.' / '.self::PASSWORD);
    }

    private function seedOccupations(): array
    {
        if (! Schema::hasTable('occupations')) {
            return [];
        }

        $rows = [
            'office_admin' => [
                'psoc_code' => 'DEMO-4110', 'classification_code' => '4110', 'isco_group' => '4',
                'title' => 'Office Clerk / Data Encoder', 'description' => 'Performs clerical support, encoding, records management, and office coordination duties.',
                'search_terms' => 'office clerk data encoder administrative assistant records management', 'general_term' => 'office administration',
            ],
            'customer_service' => [
                'psoc_code' => 'DEMO-4222', 'classification_code' => '4222', 'isco_group' => '4',
                'title' => 'Customer Service Representative', 'description' => 'Handles customer inquiries, service requests, records, and support channels.',
                'search_terms' => 'customer service representative front desk call center support', 'general_term' => 'customer service',
            ],
            'web_developer' => [
                'psoc_code' => 'DEMO-2513', 'classification_code' => '2513', 'isco_group' => '2',
                'title' => 'Web Developer', 'description' => 'Builds and maintains websites, web applications, and digital service platforms.',
                'search_terms' => 'web developer software developer programmer react laravel javascript', 'general_term' => 'information technology',
            ],
            'driver' => [
                'psoc_code' => 'DEMO-8322', 'classification_code' => '8322', 'isco_group' => '8',
                'title' => 'Delivery Driver', 'description' => 'Operates light vehicles for delivery, route coordination, and customer handoff.',
                'search_terms' => 'driver delivery driver logistics vehicle operation', 'general_term' => 'transportation and logistics',
            ],
            'accounting' => [
                'psoc_code' => 'DEMO-4311', 'classification_code' => '4311', 'isco_group' => '4',
                'title' => 'Accounting Clerk', 'description' => 'Supports financial records, encoding, reconciliation, and basic bookkeeping.',
                'search_terms' => 'accounting clerk bookkeeper finance assistant excel', 'general_term' => 'accounting and finance',
            ],
            'nurse' => [
                'psoc_code' => 'DEMO-2221', 'classification_code' => '2221', 'isco_group' => '2',
                'title' => 'Registered Nurse', 'description' => 'Provides nursing care, treatment, and clinical support to patients.',
                'search_terms' => 'nurse registered nurse rn clinic hospital healthcare', 'general_term' => 'healthcare and medical',
            ],
            'it_support' => [
                'psoc_code' => 'DEMO-3512', 'classification_code' => '3512', 'isco_group' => '3',
                'title' => 'IT Support Specialist', 'description' => 'Provides technical assistance, troubleshooting, and network support.',
                'search_terms' => 'it support technician helpdesk network computer', 'general_term' => 'information technology',
            ],
            'civil_engineer' => [
                'psoc_code' => 'DEMO-2142', 'classification_code' => '2142', 'isco_group' => '2',
                'title' => 'Civil Engineer', 'description' => 'Designs, plans, and oversees construction projects and infrastructure.',
                'search_terms' => 'civil engineer construction site engineer project manager', 'general_term' => 'engineering and construction',
            ],
            'hr_specialist' => [
                'psoc_code' => 'DEMO-2423', 'classification_code' => '2423', 'isco_group' => '2',
                'title' => 'Human Resources Specialist', 'description' => 'Handles recruitment, employee relations, payroll, and HR administration.',
                'search_terms' => 'hr human resources recruitment payroll admin', 'general_term' => 'human resources',
            ],
        ];

        $occupations = [];

        foreach ($rows as $key => $row) {
            $occupation = Occupation::query()->updateOrCreate(
                ['psoc_code' => $row['psoc_code']],
                $this->onlyExistingColumns('occupations', [
                    'classification_code' => $row['classification_code'],
                    'isco_group' => $row['isco_group'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'search_terms' => $row['search_terms'],
                    'version' => 'demo',
                    'source' => 'local_demo',
                    'is_active' => true,
                ])
            );

            $this->syncOccupationGeneralTerm($occupation, $row['general_term']);
            $occupations[$key] = $occupation->fresh();
        }

        return $occupations;
    }

    private function seedEmployers(): array
    {
        $employersData = [];
        $baseLat = 15.9758;
        $baseLng = 120.5707;
        
        $companies = [
            ['Northstar Business Solutions', 'Business Process and Office Support', 'small', '0a5c36,146a47'],
            ['Pangasinan Retail Cooperative', 'Retail and Logistics', 'medium', '1e3a8a,1d4ed8'],
            ['Urdaneta General Hospital', 'Healthcare', 'large', '991b1b,b91c1c'],
            ['Pangasinan Tech Solutions', 'Information Technology', 'small', '4c1d95,5b21b6'],
            ['Golden Harvest Construction', 'Construction', 'medium', '854d0e,a16207'],
            ['Urdaneta Supermart', 'Retail and Logistics', 'large', '166534,14532d'],
            ['Agno Valley IT Academy', 'Education and Training', 'small', '3730a3,312e81'],
            ['Central Pangasinan Bank', 'Finance and Insurance', 'medium', '115e59,134e4a'],
            ['Sunrise Manufacturing', 'Manufacturing', 'large', '9a3412,7c2d12'],
            ['Elite Delivery Services', 'Transportation', 'medium', '86198f,701a75'],
        ];

        foreach ($companies as $index => $c) {
            $key = 'emp_' . $index;
            $email = $index === 0 ? self::PRIMARY_EMPLOYER_EMAIL : "employer{$index}@ipeso.test";
            
            // Scatter around Urdaneta Center
            $lat = $baseLat + ((rand(-50, 50) / 1000) * 1.5);
            $lng = $baseLng + ((rand(-50, 50) / 1000) * 1.5);

            $employersData[$key] = $this->seedEmployer([
                'email' => $email,
                'company_name' => $c[0],
                'trade_name' => $c[0],
                'industry_type' => $c[1],
                'industry' => $c[1],
                'company_size' => $c[2],
                'company_description' => 'A reputable employer based in Urdaneta City.',
                'logo_url' => "https://api.dicebear.com/7.x/shapes/svg?seed={$c[0]}&backgroundColor={$c[3]}&shape1Color=ffffff&shape2Color=fef2f2",
                'latitude' => $lat,
                'longitude' => $lng,
            ]);
        }
        
        return $employersData;
    }

    private function seedEmployer(array $data): Employer
    {
        $query = Employer::query();
        if (Schema::hasColumn('employers', 'deleted_at')) {
            $query->withTrashed();
        }

        $employer = $query->where('email', $data['email'])->first() ?? new Employer();

        $employer->forceFill($this->onlyExistingColumns('employers', array_merge($data, [
            'password' => Hash::make(self::PASSWORD),
            'company_type' => 'corporation_partnership',
            'representative_name' => 'HR Representative',
            'representative_contact_number' => '09171234567',
            'complete_address' => 'MacArthur Highway, Urdaneta City, Pangasinan',
            'province_code' => '015500000',
            'city_code' => '015546000',
            'tin' => '900-111-222-000',
            'verification_status' => 'verified',
            'verified_at' => now(),
            'email_verified_at' => now(),
        ])))->save();

        if (method_exists($employer, 'trashed') && $employer->trashed()) {
            $employer->restore();
        }

        return $employer->fresh();
    }

    private function seedSeekers(): array
    {
        $seekersData = [
            'juan' => [
                'email' => self::SEEKER_EMAIL,
                'first' => 'Juan', 'last' => 'Dela Cruz',
                'educ' => 'College Graduate',
                'occupations' => ['office_admin', 'customer_service'],
                'skills' => ['Data Entry', 'Microsoft Excel', 'Customer Service', 'Communication'],
            ],
            'maria' => [
                'email' => self::SEEKER_NURSE,
                'first' => 'Maria', 'last' => 'Clara',
                'educ' => 'College Graduate',
                'occupations' => ['nurse'],
                'skills' => ['Patient Care', 'Vital Signs Monitoring', 'First Aid', 'Empathy', 'Communication'],
            ],
            'jose' => [
                'email' => self::SEEKER_IT,
                'first' => 'Jose', 'last' => 'Rizal',
                'educ' => 'College Graduate',
                'occupations' => ['web_developer', 'it_support'],
                'skills' => ['React.js', 'Laravel', 'JavaScript', 'Troubleshooting', 'Problem Solving'],
            ],
            'andres' => [
                'email' => self::SEEKER_DRIVER,
                'first' => 'Andres', 'last' => 'Bonifacio',
                'educ' => 'High School Graduate',
                'occupations' => ['driver'],
                'skills' => ['Driving', 'Defensive Driving', 'Route Planning', 'Reliability'],
            ],
            'gabriela' => [
                'email' => self::SEEKER_HR,
                'first' => 'Gabriela', 'last' => 'Silang',
                'educ' => 'College Graduate',
                'occupations' => ['hr_specialist', 'office_admin'],
                'skills' => ['Recruitment', 'Payroll Processing', 'Employee Relations', 'Communication'],
            ],
        ];

        $results = [];
        $idCounter = $this->nextDemoSeekerId();

        foreach ($seekersData as $key => $data) {
            $seeker = JobSeeker::query()->where('email', $data['email'])->first();

            if (! $seeker) {
                $seeker = new JobSeeker();
                $seeker->incrementing = false;
                $seeker->setAttribute('seeker_id', $idCounter++);
            }

            $seeker->incrementing = false;
            $seeker->forceFill($this->onlyExistingColumns('job_seekers', [
                'first_name' => $data['first'],
                'last_name' => $data['last'],
                'email' => $data['email'],
                'password' => Hash::make(self::PASSWORD),
                'mobile_number' => '09175550123',
                'complete_address' => 'Zone 2, Poblacion, Urdaneta City, Pangasinan',
                'educ_attainment' => $data['educ'],
                'skills' => $data['skills'],
                'email_verified_at' => now(),
                'is_verified' => true,
                'verification_status' => 'verified',
                'verified_at' => now(),
                'date_of_birth' => Carbon::create(1995, 1, 1)->toDateString(),
                'sex' => 'male',
                'civil_status' => 'single',
                'address_province_code' => '015500000',
                'address_city_code' => '015546000',
                'profile_completed' => true,
                'profile_completed_at' => now(),
            ]))->save();

            $results[$key] = [
                'model' => $seeker->fresh(),
                'profile' => $data,
            ];
        }

        return $results;
    }

    private function seedSeekerProfileRows(JobSeeker $seeker, array $occupations, array $profileData): void
    {
        $seekerId = $seeker->getKey();

        $this->deleteRows('seeker_occupations', 'seeker_id', $seekerId);
        $this->deleteRows('seeker_skills', 'seeker_id', $seekerId);

        foreach ($profileData['occupations'] as $index => $occKey) {
            $occ = $occupations[$occKey] ?? null;
            if ($occ) {
                $this->createModel(SeekerOccupation::class, 'seeker_occupations', [
                    'seeker_id' => $seekerId,
                    'occupation_id' => $occ->id,
                    'general_term' => $occ->general_term ?? 'general',
                    'occupation_title' => $occ->title,
                    'raw_job_title' => $occ->title,
                    'status' => 'standardized',
                    'mapped_at' => now(),
                    'preference_order' => $index + 1,
                ]);
            }
        }

        foreach ($profileData['skills'] as $skillName) {
            $this->createModel(SeekerSkill::class, 'seeker_skills', [
                'seeker_id' => $seekerId,
                'skill_name' => $skillName,
                'normalized_skill_name' => $this->normalize($skillName),
                'skill_type' => 'technical',
                'source' => 'system',
                'is_official' => true,
                'proficiency' => 'advanced',
                'years_of_experience' => 2,
                'is_verified' => true,
            ]);
        }
    }

    private function seedVacancies(array $employers, array $occupations): array
    {
        $vacancies = [];
        $i = 1;

        $jobTemplates = [
            ['office_admin', 'office administration', 'Data Encoder'],
            ['customer_service', 'customer service', 'Support Associate'],
            ['driver', 'transportation and logistics', 'Delivery Driver'],
            ['accounting', 'accounting and finance', 'Accounting Clerk'],
            ['nurse', 'healthcare and medical', 'Registered Nurse'],
            ['web_developer', 'information technology', 'Frontend Web Developer'],
            ['it_support', 'information technology', 'IT Helpdesk Support'],
            ['civil_engineer', 'engineering and construction', 'Project Civil Engineer'],
            ['hr_specialist', 'human resources', 'HR Officer'],
            ['office_admin', 'office administration', 'Admin Assistant'],
        ];

        foreach ($employers as $empKey => $employer) {
            // Give each employer 5 distinct jobs
            $selectedJobs = array_slice($jobTemplates, ($i % 5), 5);
            if (count($selectedJobs) < 5) {
                 $selectedJobs = array_merge($selectedJobs, array_slice($jobTemplates, 0, 5 - count($selectedJobs)));
            }

            foreach ($selectedJobs as $index => $jobData) {
                $occupation = $occupations[$jobData[0]] ?? null;
                if (! $occupation) continue;

                $vacancy = JobVacancy::query()
                    ->where('employer_id', $employer->getKey())
                    ->where('job_title', $jobData[2])
                    ->first() ?? new JobVacancy();

                $vacancy->forceFill($this->onlyExistingColumns('job_vacancies', [
                    'employer_id' => $employer->getKey(),
                    'occupation_id' => $occupation->id,
                    'general_term' => $jobData[1],
                    'job_title' => $jobData[2],
                    'employment_type' => 'Full-Time',
                    'work_setup' => 'On-site',
                    'location' => 'Urdaneta City, Pangasinan',
                    'province_code' => '015500000',
                    'city_code' => '015546000',
                    'latitude' => $employer->latitude,
                    'longitude' => $employer->longitude,
                    'job_description' => 'A fulfilling role performing standard duties for ' . $jobData[2],
                    'vacancies_count' => rand(1, 5),
                    'minimum_education' => 'College Graduate',
                    'salary_min' => 15000 + ($i * 100),
                    'salary_max' => 20000 + ($i * 100),
                    'salary_type' => 'Monthly',
                    'required_skills' => explode(' ', $occupation->search_terms),
                    'soft_skills' => ['Communication', 'Teamwork'],
                    'application_deadline' => now()->addDays(30)->toDateString(),
                    'status' => 'active',
                    'created_at' => now()->subDays(rand(1, 5)),
                    'updated_at' => now()->subDays(rand(1, 5)),
                ]))->save();

                $vacancies[] = $vacancy->fresh();
                $i++;
            }
        }

        return $vacancies;
    }

    private function seedApplications(array $seekers, array $vacancies, array $employers): void
    {
        if (! Schema::hasTable('applications')) {
            return;
        }

        DB::table('interview_schedules')->delete();
        DB::table('applications')->delete();

        // 1. Juan (office admin) applying to Northstar Data Encoder
        $v1 = collect($vacancies)->firstWhere('job_title', 'Data Encoder');
        if ($v1) {
            $app1 = $this->createApplication($v1->post_id, $seekers['juan']['model']->seeker_id, 'pending', 95.5);
            $this->createApplication($v1->post_id, $seekers['gabriela']['model']->seeker_id, 'reviewed', 82.0);
        }

        // 2. Maria (nurse) applying to Hospital
        $v2 = collect($vacancies)->firstWhere('job_title', 'Registered Nurse');
        if ($v2) {
            $app2 = $this->createApplication($v2->post_id, $seekers['maria']['model']->seeker_id, 'interview', 98.2);
            $this->createInterview($app2->apply_id);
        }

        // 3. Jose (IT) applying to Tech
        $v3 = collect($vacancies)->firstWhere('job_title', 'Frontend Web Developer');
        if ($v3) {
            $this->createApplication($v3->post_id, $seekers['jose']['model']->seeker_id, 'hired', 99.0);
        }

        // 4. Andres (driver) applying to Retail
        $v4 = collect($vacancies)->firstWhere('job_title', 'Delivery Driver');
        if ($v4) {
            $this->createApplication($v4->post_id, $seekers['andres']['model']->seeker_id, 'shortlisted', 90.0);
        }

        // 5. Gabriela (HR) applying to Construction
        $v5 = collect($vacancies)->firstWhere('job_title', 'HR Officer');
        if ($v5) {
            $this->createApplication($v5->post_id, $seekers['gabriela']['model']->seeker_id, 'rejected', 60.5);
        }
    }

    private function createApplication($postId, $seekerId, $status, $matchScore): Application
    {
        $app = new Application();
        $app->forceFill([
            'post_id' => $postId,
            'seeker_id' => $seekerId,
            'match_percentage' => $matchScore,
            'status' => $status,
            'status_changed_at' => now(),
            'created_at' => now()->subDays(rand(1, 5)),
            'updated_at' => now(),
        ])->save();
        return $app->fresh();
    }

    private function createInterview($applyId): void
    {
        if (! Schema::hasTable('interview_schedules')) {
            return;
        }

        $schedule = new InterviewSchedule();
        $schedule->forceFill([
            'apply_id' => $applyId,
            'mode_of_interview' => 'online',
            'schedule' => now()->addDays(2)->setHour(10)->setMinute(0),
            'venue_or_link' => 'https://meet.google.com/abc-defg-hij',
            'instructions' => 'Please prepare your portfolio.',
            'status' => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ])->save();
    }

    private function syncMatchingData(JobSeeker $seeker, array $vacancies): void
    {
        if (! Schema::hasTable('skill_catalog_entries')) {
            return;
        }

        $taxonomy = app(SkillTaxonomyService::class);

        if (Schema::hasTable('seeker_skills')) {
            $taxonomy->syncSeeker($seeker->fresh());
        }

        if (! Schema::hasTable('job_vacancy_skills')) {
            return;
        }

        $profileService = app(MatchingProfileService::class);

        foreach ($vacancies as $vacancy) {
            $fresh = $vacancy->fresh();
            $taxonomy->syncVacancy($fresh);

            if (Schema::hasTable('job_vacancy_certifications')) {
                $profileService->syncVacancyCertifications($fresh);
            }
        }
    }

    private function syncOccupationGeneralTerm(Occupation $occupation, string $term): void
    {
        if (! Schema::hasTable('occupation_general_terms')) {
            return;
        }

        DB::table('occupation_general_terms')->updateOrInsert(
            [
                'occupation_id' => $occupation->getKey(),
                'normalized_term' => $this->normalize($term),
                'language' => 'en',
            ],
            [
                'term' => Str::of($term)->title()->toString(),
                'source' => 'local_demo',
                'priority' => 10,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    private function createModel(string $modelClass, string $table, array $attributes): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $model = new $modelClass();
        if ($model instanceof Model) {
            $model->forceFill($this->onlyExistingColumns($table, $attributes))->save();
        }
    }

    private function deleteRows(string $table, string $column, mixed $value): void
    {
        if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
            DB::table($table)->where($column, $value)->delete();
        }
    }

    private function onlyExistingColumns(string $table, array $attributes): array
    {
        if (! Schema::hasTable($table)) {
            return [];
        }

        $columns = $this->columnCache[$table] ??= Schema::getColumnListing($table);
        $allowed = array_flip($columns);

        return array_intersect_key($attributes, $allowed);
    }

    private function nextDemoSeekerId(): int
    {
        $preferredId = 900001;

        if (! JobSeeker::query()->whereKey($preferredId)->exists()) {
            return $preferredId;
        }

        return (int) JobSeeker::query()->max('seeker_id') + 1;
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace('&', ' and ')
            ->replaceMatches('/[^a-z0-9+#.]+/', ' ')
            ->squish()
            ->toString();
    }
}
