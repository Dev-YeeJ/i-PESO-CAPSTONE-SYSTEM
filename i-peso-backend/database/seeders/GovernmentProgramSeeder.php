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
        $programs = [
            [
                'program_name' => 'SPES 2026 Application',
                'category' => 'spes',
                'short_description' => 'Summer employment assistance for qualified students and out-of-school youth.',
                'description' => 'The Special Program for Employment of Students provides temporary employment and work exposure to eligible youth in Urdaneta City.',
                'target_beneficiaries' => 'Students and out-of-school youth who meet SPES eligibility rules.',
                'eligibility_requirements' => ['Resident of Urdaneta City', 'Student or out-of-school youth', 'Meets current family income requirement'],
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
                'required_documents' => ['Valid government ID', 'Barangay certificate'],
                'skills' => ['Occupational Safety', 'Community Service'],
                'target_industry' => 'Community Services',
                'start_date' => '2026-08-03',
                'end_date' => '2026-08-14',
                'application_deadline' => '2026-07-24',
                'total_slots' => 150,
            ],
            [
                'program_name' => 'TESDA SMAW NC II Training',
                'category' => 'tech_voc_training',
                'short_description' => 'Competency-based Shielded Metal Arc Welding training aligned with local hiring demand.',
                'description' => 'Hands-on technical training covering SMAW equipment, welding procedures, safety, and national competency assessment preparation.',
                'target_beneficiaries' => 'Job seekers pursuing welding and metal fabrication occupations.',
                'eligibility_requirements' => ['At least 18 years old', 'Physically fit for workshop training'],
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
