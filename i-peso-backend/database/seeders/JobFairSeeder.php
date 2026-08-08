<?php

namespace Database\Seeders;

use App\Models\Administrator;
use App\Models\JobFair;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JobFairSeeder extends Seeder
{
    private const REQUIREMENTS = [
        'business_permit' => 'Business Permit',
        'business_registration' => 'DTI / BIR / SEC Registration',
        'philjobnet_registration' => 'PhilJobNet Registration',
        'job_vacancy_count' => 'Job Vacancy Count',
        'posterized_vacancy' => 'Posterized Job Vacancy with Contact Details',
        'no_pending_case' => 'Certificate of No Pending Case from DOLE',
        'confirmation_slip' => 'Confirmation Slip',
    ];

    public function run(): void
    {
        $admin = Administrator::query()->first();

        if (! $admin) {
            $this->command?->warn('JobFairSeeder skipped: no administrator account exists yet.');

            return;
        }

        $fairs = [
            [
                'title' => 'Urdaneta City Mega Job Fair 2026',
                'description' => 'City-wide job fair open to all sectors, featuring local and regional employers hiring across office, retail, healthcare, and technical roles.',
                'venue' => "Urdaneta City People's Park",
                'event_date' => now()->addDays(21)->toDateString(),
                'start_date' => now()->addDays(21)->toDateString(),
                'end_date' => now()->addDays(21)->toDateString(),
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'sector' => 'local',
                'target_sector' => 'All sectors',
                'status' => 'published',
                'is_public' => true,
                'published_at' => now()->subDays(3),
                'submission_deadline' => now()->addDays(14),
                'contact_email' => 'peso@urdanetacity.gov.ph',
                'maximum_representatives' => 2,
            ],
            [
                'title' => 'Overseas Employment Caravan',
                'description' => 'Special job fair in partnership with POEA-licensed recruitment agencies for overseas job opportunities.',
                'venue' => 'Robinsons Place Urdaneta, Activity Center',
                'event_date' => now()->addDays(35)->toDateString(),
                'start_date' => now()->addDays(35)->toDateString(),
                'end_date' => now()->addDays(35)->toDateString(),
                'start_time' => '09:00:00',
                'end_time' => '16:00:00',
                'sector' => 'overseas',
                'target_sector' => 'Overseas Filipino Workers',
                'status' => 'published',
                'is_public' => true,
                'published_at' => now()->subDays(1),
                'submission_deadline' => now()->addDays(25),
                'contact_email' => 'peso@urdanetacity.gov.ph',
                'maximum_representatives' => 3,
            ],
            [
                'title' => 'Tech & BPO Career Fair',
                'description' => 'Focused job fair for IT, BPO, and customer service employers, held in partnership with local training institutions.',
                'venue' => 'Urdaneta City Coliseum',
                'event_date' => now()->subDays(30)->toDateString(),
                'start_date' => now()->subDays(30)->toDateString(),
                'end_date' => now()->subDays(30)->toDateString(),
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'sector' => 'local',
                'target_sector' => 'Information Technology & BPO',
                'status' => 'completed',
                'is_public' => true,
                'published_at' => now()->subDays(45),
                'submission_deadline' => now()->subDays(37),
                'contact_email' => 'peso@urdanetacity.gov.ph',
                'maximum_representatives' => 2,
            ],
            [
                'title' => 'Barangay Outreach Job Fair — San Vicente',
                'description' => 'Small-scale barangay-level job fair to bring PESO services closer to outlying communities. Still finalizing employer list.',
                'venue' => 'San Vicente Barangay Covered Court',
                'event_date' => now()->addDays(50)->toDateString(),
                'start_date' => now()->addDays(50)->toDateString(),
                'end_date' => now()->addDays(50)->toDateString(),
                'start_time' => '08:00:00',
                'end_time' => '15:00:00',
                'sector' => 'local',
                'target_sector' => 'Barangay residents',
                'status' => 'draft',
                'is_public' => false,
                'published_at' => null,
                'submission_deadline' => now()->addDays(40),
                'contact_email' => 'peso@urdanetacity.gov.ph',
                'maximum_representatives' => 2,
            ],
        ];

        foreach ($fairs as $data) {
            $fair = JobFair::query()->updateOrCreate(
                ['title' => $data['title']],
                [
                    ...$data,
                    'admin_id' => $admin->admin_id,
                    'created_by' => $admin->admin_id,
                    'published_by' => $data['is_public'] ? $admin->admin_id : null,
                ]
            );

            $this->seedRequirements($fair);
        }

        $this->command?->info('Job fairs seeded: '.count($fairs));
    }

    private function seedRequirements(JobFair $fair): void
    {
        $order = 0;

        foreach (self::REQUIREMENTS as $code => $label) {
            DB::table('job_fair_requirements')->updateOrInsert(
                ['job_fair_id' => $fair->job_fair_id, 'code' => $code],
                [
                    'label' => $label,
                    'is_required' => true,
                    'sort_order' => $order++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
