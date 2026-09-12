<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EstablishmentReportFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_employer_preview_maps_report_fields_and_never_leaks_another_employers_applicants(): void
    {
        $data = $this->seedReportData();
        Sanctum::actingAs($data['employer_one']);

        // Renamed from "Establishment Report" — this is the all-sources ATS
        // activity cross-reference (App\Services\EstablishmentReportService),
        // now correctly labeled and moved under Placement Report. The real
        // Establishment Report (RO1-JF Form 3) is JobFairResultReport-backed;
        // see test_establishment_report_browses_real_job_fair_result_reports().
        $this->getJson('/api/employer/reports/hiring-activity/preview?source=all')
            ->assertOk()
            ->assertJsonPath('title', 'HIRING ACTIVITY REPORT')
            ->assertJsonPath('form_code', null)
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.hots', 1)
            ->assertJsonPath('summary.rejected', 1)
            ->assertJsonPath('reports.0.establishment.name', 'Northstar Manufacturing')
            ->assertJsonPath('reports.0.entries.0.name', 'Dela Cruz, Juan P.')
            ->assertJsonPath('reports.0.entries.0.age_range', '25-34 years old')
            ->assertJsonPath('reports.0.entries.0.educational_attainment_code', 'C')
            ->assertJsonPath('reports.0.entries.0.application_status', 'Hired-on-the-Spot')
            ->assertJsonPath('reports.0.entries.1.employer_mismatch_reason_code', 'lack_competencies_skills')
            ->assertJsonPath('reports.0.entries.1.seeker_mismatch_reason_code', 'transportation_location');

        $this->getJson('/api/employer/reports/hiring-activity/preview?vacancy_id='.$data['vacancy_two_id'])
            ->assertOk()
            ->assertJsonPath('summary.total', 0)
            ->assertJsonCount(0, 'reports.0.entries');
    }

    public function test_admin_can_filter_the_report_to_a_selected_establishment(): void
    {
        $data = $this->seedReportData();
        Sanctum::actingAs($data['admin']);

        $this->getJson('/api/admin/reports/hiring-activity/preview?employer_id='.$data['employer_two']->employer_id)
            ->assertOk()
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('reports.0.establishment.name', 'Second Employer')
            ->assertJsonPath('reports.0.entries.0.position_applying_for', 'Warehouse Associate')
            ->assertJsonPath('reports.0.entries.0.application_status', 'Qualified');
    }

    public function test_hiring_activity_pdf_and_csv_exports_remain_available(): void
    {
        $data = $this->seedReportData();
        Sanctum::actingAs($data['employer_one']);

        $pdf = $this->postJson('/api/employer/reports/hiring-activity/export', [
            'format' => 'pdf',
            'source' => 'all',
        ])->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $pdf->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());

        $csv = $this->postJson('/api/employer/reports/hiring-activity/export', [
            'format' => 'csv',
            'source' => 'all',
        ])->assertOk();
        $this->assertStringContainsString('text/csv', (string) $csv->headers->get('content-type'));
        $this->assertStringContainsString('Northstar Manufacturing', $csv->streamedContent());
        $this->assertStringContainsString('Employer Mismatch Reason', $csv->streamedContent());
    }

    public function test_establishment_report_browses_real_job_fair_result_reports(): void
    {
        $data = $this->seedReportData();

        Schema::create('job_fair_result_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_fair_id');
            $table->unsignedBigInteger('employer_id')->nullable();
            $table->string('company_name')->nullable();
            $table->string('source')->nullable();
            $table->unsignedInteger('total_male')->default(0);
            $table->unsignedInteger('total_female')->default(0);
            $table->unsignedInteger('total_applicants')->default(0);
            $table->unsignedInteger('total_qualified')->default(0);
            $table->unsignedInteger('total_hots')->default(0);
            $table->unsignedInteger('total_near_hired')->default(0);
            $table->unsignedInteger('total_rejected')->default(0);
            $table->unsignedInteger('total_vacancies_solicited')->default(0);
            $table->unsignedInteger('total_vacancies_offered')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
        Schema::create('job_fair_result_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('result_report_id');
            $table->timestamps();
        });
        Schema::create('job_fair_result_mismatch_tallies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('result_report_id');
            $table->timestamps();
        });

        $reportId = DB::table('job_fair_result_reports')->insertGetId([
            'job_fair_id' => $data['fair_id'],
            'employer_id' => $data['employer_one']->employer_id,
            'company_name' => 'Northstar Manufacturing',
            'source' => 'employer_self_service',
            'total_male' => 1, 'total_female' => 1, 'total_applicants' => 2, 'total_qualified' => 1,
            'total_hots' => 1, 'total_near_hired' => 0, 'total_rejected' => 0,
            'total_vacancies_solicited' => 2, 'total_vacancies_offered' => 2,
            'submitted_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        Sanctum::actingAs($data['employer_one']);
        $this->getJson('/api/employer/reports/establishment-report/preview')
            ->assertOk()
            ->assertJsonPath('summary.total_reports', 1)
            ->assertJsonPath('summary.total_applicants', 2)
            ->assertJsonPath('reports.0.report.id', $reportId)
            ->assertJsonPath('reports.0.job_fair.title', 'Urdaneta City Job Fair 2026');

        // Employer two has no result reports of their own — never leaks employer one's.
        Sanctum::actingAs($data['employer_two']);
        $this->getJson('/api/employer/reports/establishment-report/preview')
            ->assertOk()
            ->assertJsonPath('summary.total_reports', 0);
    }

    private function seedReportData(): array
    {
        $employerOne = Employer::create([
            'email' => 'northstar@example.test',
            'password' => 'password123',
            'company_type' => 'corporation_partnership',
            'company_name' => 'Northstar Manufacturing',
            'complete_address' => 'Urdaneta City, Pangasinan',
            'representative_name' => 'Maria Santos',
            'mobile_number' => '09171234567',
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
        $employerTwo = Employer::create([
            'email' => 'second@example.test',
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'company_name' => 'Second Employer',
            'complete_address' => 'Dagupan City, Pangasinan',
            'representative_name' => 'Pedro Reyes',
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'reports-admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        DB::table('job_seekers')->insert([
            [
                'seeker_id' => 101,
                'first_name' => 'Juan',
                'middle_name' => 'Perez',
                'last_name' => 'Dela Cruz',
                'mobile_number' => '09180000001',
                'email' => 'juan@example.test',
                'password' => 'password123',
                'date_of_birth' => now()->subYears(30)->toDateString(),
                'sex' => 'male',
                'educ_attainment' => 'College Graduate',
                'address_municipality_city' => 'Urdaneta City',
                'is_former_ofw' => true,
                'profile_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'seeker_id' => 102,
                'first_name' => 'Ana',
                'middle_name' => null,
                'last_name' => 'Garcia',
                'mobile_number' => '09180000002',
                'email' => 'ana@example.test',
                'password' => 'password123',
                'date_of_birth' => now()->subYears(22)->toDateString(),
                'sex' => 'female',
                'educ_attainment' => 'K-12 Senior High School Graduate',
                'address_municipality_city' => 'Binalonan',
                'is_former_ofw' => false,
                'profile_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'seeker_id' => 103,
                'first_name' => 'Liza',
                'middle_name' => null,
                'last_name' => 'Ramos',
                'mobile_number' => '09180000003',
                'email' => 'liza@example.test',
                'password' => 'password123',
                'date_of_birth' => now()->subYears(40)->toDateString(),
                'sex' => 'female',
                'educ_attainment' => 'High School Graduate',
                'address_municipality_city' => 'Dagupan City',
                'is_former_ofw' => false,
                'profile_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $vacancyOneId = DB::table('job_vacancies')->insertGetId([
            'employer_id' => $employerOne->employer_id,
            'job_title' => 'Production Operator',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'post_id');
        $vacancyTwoId = DB::table('job_vacancies')->insertGetId([
            'employer_id' => $employerTwo->employer_id,
            'job_title' => 'Warehouse Associate',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'post_id');
        $fairId = DB::table('job_fairs')->insertGetId([
            'admin_id' => $admin->admin_id,
            'title' => 'Urdaneta City Job Fair 2026',
            'start_date' => '2026-06-20',
            'end_date' => '2026-06-20',
            'venue' => 'CB Mall Activity Center',
            'status' => 'completed',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'job_fair_id');

        DB::table('job_fair_employers')->insert([
            'job_fair_id' => $fairId,
            'employer_id' => $employerOne->employer_id,
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('applications')->insert([
            [
                'post_id' => $vacancyOneId,
                'seeker_id' => 101,
                'job_fair_id' => $fairId,
                'is_hots' => true,
                'status' => 'hired',
                'employer_mismatch_reason_code' => null,
                'seeker_mismatch_reason_code' => null,
                'mismatch_reason_details' => null,
                'created_at' => now()->subDays(8),
                'updated_at' => now()->subDays(8),
            ],
            [
                'post_id' => $vacancyOneId,
                'seeker_id' => 102,
                'job_fair_id' => null,
                'is_hots' => false,
                'status' => 'rejected',
                'employer_mismatch_reason_code' => 'lack_competencies_skills',
                'seeker_mismatch_reason_code' => 'transportation_location',
                'mismatch_reason_details' => 'Required machine operation competency was not demonstrated.',
                'created_at' => now()->subDays(4),
                'updated_at' => now()->subDays(4),
            ],
            [
                'post_id' => $vacancyTwoId,
                'seeker_id' => 103,
                'job_fair_id' => null,
                'is_hots' => false,
                'status' => 'shortlisted',
                'employer_mismatch_reason_code' => null,
                'seeker_mismatch_reason_code' => null,
                'mismatch_reason_details' => null,
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],
        ]);

        return compact('employerOne', 'employerTwo', 'admin', 'vacancyOneId', 'vacancyTwoId', 'fairId') + [
            'employer_one' => $employerOne,
            'employer_two' => $employerTwo,
            'vacancy_two_id' => $vacancyTwoId,
            'fair_id' => $fairId,
        ];
    }

    private function createTables(): void
    {
        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('company_type')->nullable();
            $table->string('company_name')->nullable();
            $table->string('trade_name')->nullable();
            $table->string('complete_address')->nullable();
            $table->string('province')->nullable();
            $table->string('city_municipality')->nullable();
            $table->string('barangay')->nullable();
            $table->string('house_unit_street')->nullable();
            $table->string('representative_name')->nullable();
            $table->string('representative_first_name')->nullable();
            $table->string('representative_middle_name')->nullable();
            $table->string('representative_last_name')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('representative_contact_number')->nullable();
            $table->string('verification_status')->default('pending');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('administrators', function (Blueprint $table) {
            $table->id('admin_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role');
            $table->string('status');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('mobile_number')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->string('educ_attainment')->nullable();
            $table->string('address_municipality_city')->nullable();
            $table->string('employment_status')->nullable();
            $table->string('unemployment_reason')->nullable();
            $table->string('unemployment_reason_others')->nullable();
            $table->boolean('is_former_ofw')->default(false);
            $table->boolean('profile_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('seeker_educations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->string('level')->nullable();
            $table->integer('year_graduated')->nullable();
            $table->timestamps();
        });

        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('job_title');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('job_fairs', function (Blueprint $table) {
            $table->id('job_fair_id');
            $table->unsignedBigInteger('admin_id')->nullable();
            $table->string('title');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('event_date')->nullable();
            $table->string('venue')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });

        Schema::create('job_fair_employers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_fair_id');
            $table->unsignedBigInteger('employer_id');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('seeker_id');
            $table->unsignedBigInteger('job_fair_id')->nullable();
            $table->boolean('is_hots')->default(false);
            $table->string('status')->default('pending');
            $table->string('dole_mismatch_code')->nullable();
            $table->string('employer_mismatch_reason_code')->nullable();
            $table->string('seeker_mismatch_reason_code')->nullable();
            $table->text('mismatch_reason_details')->nullable();
            $table->text('employer_remarks')->nullable();
            $table->timestamps();
        });
    }
}
