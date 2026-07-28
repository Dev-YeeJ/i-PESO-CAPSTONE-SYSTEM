<?php

namespace Database\Seeders;

use App\Models\Administrator;
use App\Models\GovernmentProgram;
use App\Models\JobFair;
use App\Services\SkillTaxonomyService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GovernmentProgramSeeder extends Seeder
{
    public function run(SkillTaxonomyService $taxonomy): void
    {
        if (GovernmentProgram::query()->exists()) {
            return;
        }

        $admin = Administrator::query()->firstOrFail();

        // Eligibility rule presets are DOLE-aligned defaults. Exact thresholds change
        // per Department Order / regional issuance and year — PESO admins can edit them
        // in the program form. See docs/government-programs-refactor-plan.md (Part 3).
        $programs = [
            [
                'program_name' => 'SPES 2026 Application',
                'category' => 'spes',
                'short_description' => 'Summer employment assistance for qualified students and out-of-school youth.',
                'description' => 'The Special Program for Employment of Students provides temporary employment and work exposure to eligible youth in Urdaneta City.',
                'target_beneficiaries' => 'Students and out-of-school youth who meet SPES eligibility rules.',
                'eligibility_requirements' => ['Resident of Urdaneta City', 'Student or out-of-school youth', 'Meets current family income requirement'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 30, 'label' => 'Age 15 to 30 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Not regularly employed', 'weight' => 2, 'required' => true],
                    ['field' => 'is_4ps_beneficiary', 'op' => 'equals', 'value' => true, 'label' => '4Ps / low-income household', 'weight' => 1, 'required' => false],
                    ['field' => 'residency', 'op' => 'equals', 'value' => 'Urdaneta City', 'label' => 'Resident of Urdaneta City', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Birth certificate', 'School registration or certification', 'Barangay residency certificate'],
                'skills' => ['Workplace Readiness', 'Communication'],
                'target_industry' => 'Public Service and Local Business',
                'start_date' => '2026-07-15',
                'end_date' => '2026-08-15',
                'application_deadline' => '2026-07-08',
                'total_slots' => 100,
            ],
            [
                'program_name' => 'TUPAD Assistance Program',
                'category' => 'tupad',
                'short_description' => 'Short-term community work assistance for displaced and disadvantaged workers.',
                'description' => 'TUPAD provides temporary wage employment for qualified displaced, underemployed, and seasonal workers through community-based work.',
                'target_beneficiaries' => 'Displaced, underemployed, or seasonal workers.',
                'eligibility_requirements' => ['Resident of Urdaneta City', 'Available for community work assignment'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Unemployed / displaced worker', 'weight' => 2, 'required' => true],
                    ['field' => 'is_4ps_beneficiary', 'op' => 'equals', 'value' => true, 'label' => 'Disadvantaged / 4Ps household (prioritized)', 'weight' => 1, 'required' => false],
                    ['field' => 'residency', 'op' => 'equals', 'value' => 'Urdaneta City', 'label' => 'Resident of Urdaneta City', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Valid government ID', 'Barangay certificate'],
                'skills' => ['Occupational Safety', 'Community Service'],
                'target_industry' => 'Community Services',
                'start_date' => '2026-08-03',
                'end_date' => '2026-08-14',
                'application_deadline' => '2026-07-24',
                'total_slots' => 150,
            ],
            [
                'program_name' => 'GIP (Government Internship Program)',
                'category' => 'gip',
                'short_description' => 'Paid internship in a government office for qualified youth from low-income families.',
                'description' => 'The Government Internship Program engages youth aged 18 to 30 in three to six months of paid internship in national or local government offices to build work experience.',
                'target_beneficiaries' => 'High school graduate youth aged 18 to 30 from poor or low-income families.',
                'eligibility_requirements' => ['18 to 30 years old', 'At least high school graduate', 'From a poor or low-income family'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 30, 'label' => 'Age 18 to 30 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'High School Graduate', 'label' => 'At least high school graduate', 'weight' => 2, 'required' => true],
                    ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Not regularly employed', 'weight' => 1, 'required' => false],
                    ['field' => 'is_4ps_beneficiary', 'op' => 'equals', 'value' => true, 'label' => 'Poor / low-income family', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Valid ID', 'Birth certificate', 'Diploma or transcript', 'Barangay indigency certificate'],
                'skills' => ['Office Administration', 'Public Service'],
                'target_industry' => 'Government and Public Service',
                'start_date' => '2026-08-01',
                'end_date' => '2026-11-30',
                'application_deadline' => '2026-07-20',
                'total_slots' => 20,
            ],
            [
                'program_name' => 'DOLE-AKAP for OFWs',
                'category' => 'ofw_assistance',
                'short_description' => 'Financial and reintegration assistance for distressed or displaced Overseas Filipino Workers.',
                'description' => 'DOLE-AKAP (Abot-Kamay ang Pagtulong) provides one-time assistance to distressed, displaced, or returning Overseas Filipino Workers and their families.',
                'target_beneficiaries' => 'Distressed, displaced, or returning OFWs and former OFWs.',
                'eligibility_requirements' => ['Must be an OFW or former OFW', 'At least 18 years old'],
                'eligibility_rules' => [
                    ['field' => 'is_ofw', 'op' => 'equals', 'value' => true, 'label' => 'OFW or former OFW', 'weight' => 3, 'required' => true],
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 1, 'required' => true],
                ],
                'required_documents' => ['Valid ID', 'OEC or proof of overseas employment', 'Passport'],
                'skills' => ['Reintegration Planning'],
                'target_industry' => 'Overseas Employment',
                'start_date' => '2026-07-15',
                'end_date' => '2026-12-31',
                'application_deadline' => '2026-12-15',
                'total_slots' => 0,
            ],
            [
                'program_name' => 'TESDA SMAW NC II Training',
                'category' => 'tech_voc_training',
                'short_description' => 'Competency-based Shielded Metal Arc Welding training aligned with local hiring demand.',
                'description' => 'Hands-on technical training covering SMAW equipment, welding procedures, safety, and national competency assessment preparation.',
                'target_beneficiaries' => 'Job seekers pursuing welding and metal fabrication occupations.',
                'eligibility_requirements' => ['At least 18 years old', 'Physically fit for workshop training'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'High School Undergraduate', 'label' => 'Able to read and write (some high school)', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Valid ID', 'Birth certificate', 'Medical certificate'],
                'skills' => ['SMAW Welding', 'Welding Safety', 'Blueprint Reading'],
                'target_industry' => 'Construction and Manufacturing',
                'start_date' => '2026-07-20',
                'end_date' => '2026-09-18',
                'application_deadline' => '2026-07-12',
                'total_slots' => 25,
            ],
            [
                'program_name' => 'Bread and Pastry Production NC II',
                'category' => 'tech_voc_training',
                'short_description' => 'Practical bakery production and food safety training with NC II assessment preparation.',
                'description' => 'Participants learn bakery mise en place, bread and pastry production, food safety, costing, and workplace procedures.',
                'target_beneficiaries' => 'Job seekers and aspiring food entrepreneurs.',
                'eligibility_requirements' => ['At least 18 years old', 'Able to attend the full training schedule'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'High School Undergraduate', 'label' => 'Able to read and write (some high school)', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Valid ID', 'Birth certificate'],
                'skills' => ['Bread Production', 'Pastry Production', 'Food Safety'],
                'target_industry' => 'Hospitality and Food Services',
                'start_date' => '2026-08-10',
                'end_date' => '2026-09-25',
                'application_deadline' => '2026-07-31',
                'total_slots' => 25,
            ],
            [
                'program_name' => 'Livelihood Starter Kit Program',
                'category' => 'livelihood_program',
                'short_description' => 'Enterprise orientation and starter-kit assistance for qualified livelihood applicants.',
                'description' => 'A guided livelihood program covering basic enterprise planning, costing, market validation, and starter-kit assessment.',
                'target_beneficiaries' => 'Qualified low-income residents planning a micro-enterprise.',
                'eligibility_requirements' => ['Resident of Urdaneta City', 'Proposed livelihood plan'],
                'eligibility_rules' => [
                    ['field' => 'age', 'op' => 'between', 'min' => 18, 'max' => 200, 'label' => 'At least 18 years old', 'weight' => 2, 'required' => true],
                    ['field' => 'is_4ps_beneficiary', 'op' => 'equals', 'value' => true, 'label' => 'Disadvantaged / 4Ps household (prioritized)', 'weight' => 1, 'required' => false],
                    ['field' => 'residency', 'op' => 'equals', 'value' => 'Urdaneta City', 'label' => 'Resident of Urdaneta City', 'weight' => 1, 'required' => false],
                ],
                'required_documents' => ['Valid ID', 'Barangay indigency certificate', 'Simple livelihood proposal'],
                'skills' => ['Entrepreneurship', 'Basic Bookkeeping', 'Product Costing'],
                'target_industry' => 'Microenterprise',
                'start_date' => '2026-08-05',
                'end_date' => '2026-08-07',
                'application_deadline' => '2026-07-25',
                'total_slots' => 40,
            ],
            [
                'program_name' => 'Career Guidance Seminar',
                'category' => 'career_guidance',
                'short_description' => 'Career planning, job-search strategy, interview preparation, and PESO service orientation.',
                'description' => 'A one-day seminar helping job seekers understand career options, present their qualifications, and navigate local employment opportunities.',
                'target_beneficiaries' => 'Students, first-time job seekers, and career shifters.',
                'eligibility_requirements' => ['Open to registered i-PESO job seekers'],
                'eligibility_rules' => [],
                'required_documents' => ['Valid ID'],
                'skills' => ['Career Planning', 'Interview Skills', 'Resume Writing'],
                'target_industry' => 'Cross-industry',
                'start_date' => '2026-07-18',
                'end_date' => '2026-07-18',
                'application_deadline' => '2026-07-16',
                'total_slots' => 80,
            ],
        ];

        foreach ($programs as $entry) {
            $skills = $entry['skills'];
            unset($entry['skills']);
            $program = GovernmentProgram::create([
                ...$entry,
                'admin_id' => $admin->admin_id,
                'slug' => Str::slug($entry['program_name']),
                'venue' => 'Urdaneta City PESO Training Center',
                'location_address' => 'Urdaneta City, Pangasinan',
                'available_slots' => $entry['total_slots'],
                'program_status' => 'open',
                'visibility' => 'public',
                'contact_person' => 'PESO Programs Desk',
                'contact_email' => 'peso@urdaneta-city.gov.ph',
                'contact_phone' => '075-000-0000',
                'published_at' => now(),
            ]);

            foreach ($skills as $name) {
                $skill = $taxonomy->resolve($name, 'technical');
                $program->skills()->create([
                    'skill_id' => $skill?->id,
                    'skill_name' => $skill?->name ?? $name,
                    'type' => 'taught',
                ]);
            }
        }

        JobFair::query()->firstOrCreate(
            ['title' => 'Urdaneta City Mega Job Fair'],
            [
                'admin_id' => $admin->admin_id,
                'created_by' => $admin->admin_id,
                'description' => 'City-wide digital job fair connecting verified employers and registered job seekers.',
                'start_date' => '2026-08-21',
                'end_date' => '2026-08-21',
                'event_date' => '2026-08-21',
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'venue' => 'Urdaneta City Cultural and Sports Center',
                'sector' => 'Multi-sector',
                'status' => 'upcoming',
            ],
        );
    }
}
