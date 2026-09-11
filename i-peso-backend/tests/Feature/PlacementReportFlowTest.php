<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\Employer;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use App\Notifications\PlacementReportDue;
use App\Services\PlacementComplianceService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use Tests\TestCase;

class PlacementReportFlowTest extends TestCase
{
    use DatabaseTransactions;

    /** Files written for workbook fixtures, removed in tearDown. */
    private array $tempFiles = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }

        parent::tearDown();
    }

    public function test_upload_selects_the_sheet_matching_the_coverage_month(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $file = $this->workbook([
            'JANUARY' => [['Ana', 'Santos', '2026-01-06', 'Encoder']],
            'MARCH' => [
                ['Juan', 'Dela Cruz', '2026-03-10', 'Machine Operator'],
                ['Maria', 'Reyes', '2026-03-18', 'Quality Inspector'],
            ],
        ]);

        // A workbook with a tab per month is the common employer format — the
        // importer must not silently read whichever sheet happened to be active.
        $response = $this->postJson('/api/employer/placement-reports', [
            'file' => $file,
            'coverage_month' => 3,
            'coverage_year' => 2026,
        ])->assertCreated();

        $response->assertJsonPath('data.selected_sheet', 'MARCH')
            ->assertJsonPath('data.row_count', 2)
            ->assertJsonPath('data.sheet_names', ['JANUARY', 'MARCH']);
    }

    public function test_employer_can_switch_to_another_sheet_in_the_same_workbook(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $file = $this->workbook([
            'MARCH' => [['Juan', 'Dela Cruz', '2026-03-10', 'Machine Operator']],
            'APRIL' => [
                ['Ana', 'Santos', '2026-04-04', 'Encoder'],
                ['Ben', 'Lim', '2026-04-11', 'Driver'],
                ['Cita', 'Ong', '2026-04-19', 'Packer'],
            ],
        ]);

        $uploadId = $this->postJson('/api/employer/placement-reports', [
            'file' => $file,
            'coverage_month' => 3,
            'coverage_year' => 2026,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/employer/placement-reports/{$uploadId}/sheet", ['sheet' => 'APRIL'])
            ->assertOk()
            ->assertJsonPath('data.selected_sheet', 'APRIL')
            ->assertJsonPath('data.row_count', 3);

        $this->postJson("/api/employer/placement-reports/{$uploadId}/sheet", ['sheet' => 'DECEMBER'])
            ->assertStatus(422)
            ->assertJsonPath('errors.sheet.0', 'That sheet is not part of this workbook.');
    }

    public function test_header_row_is_found_beneath_logo_and_title_rows(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        // Mirrors the real employer file: a logo row and a yellow banner sit
        // above the actual column headers.
        $file = $this->workbook(
            ['MARCH' => [['Juan', 'Dela Cruz', '2026-03-10', 'Machine Operator']]],
            withBanner: true,
        );

        $response = $this->postJson('/api/employer/placement-reports', [
            'file' => $file,
            'coverage_month' => 3,
            'coverage_year' => 2026,
        ])->assertCreated();

        $response->assertJsonPath('data.row_count', 1);
        $this->assertSame(
            ['FIRST NAME', 'LAST NAME', 'DATE HIRED', 'POSITION'],
            $response->json('data.detected_headers'),
        );
        // Auto-mapping should already have matched every column.
        $this->assertEquals(
            ['FIRST NAME' => 'first_name', 'LAST NAME' => 'last_name', 'DATE HIRED' => 'date_hired', 'POSITION' => 'position'],
            $response->json('data.mapping'),
        );
    }

    public function test_a_second_report_for_an_already_submitted_period_is_refused(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->submittedReport($employer, month: 3, year: 2026);

        // Two approved reports covering March would both feed the SPRS March
        // total, inflating the placement figure PESO sends to DOLE.
        $this->postJson('/api/employer/placement-reports', [
            'file' => $this->workbook(['MARCH' => [['Ana', 'Santos', '2026-03-20', 'Encoder']]]),
            'coverage_month' => 3,
            'coverage_year' => 2026,
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.coverage_month.0', 'You already have a report for March 2026 that is awaiting PESO review. Delete or wait for that one instead of sending a second.');

        // A different period is unaffected.
        $this->postJson('/api/employer/placement-reports', [
            'file' => $this->workbook(['APRIL' => [['Ana', 'Santos', '2026-04-20', 'Encoder']]]),
            'coverage_month' => 4,
            'coverage_year' => 2026,
        ])->assertCreated();
    }

    public function test_the_database_refuses_a_second_settled_report_for_the_same_employer_and_period(): void
    {
        $employer = $this->employer();
        $this->submittedReport($employer, month: 3, year: 2026);

        // assertNoSettledReportFor()/assertNoApprovedTwin() are both plain
        // check-then-act and can be raced by two concurrent requests. The
        // unique settlement_key index is the actual backstop: even a direct,
        // unguarded model write for a second settled report of the same
        // employer+period must now be refused at the database level, not
        // just the application layer.
        $this->expectException(UniqueConstraintViolationException::class);

        PlacementReportUpload::create([
            'employer_id' => $employer->employer_id,
            'original_filename' => 'march-again.xlsx',
            'stored_path' => null,
            'row_count' => 1,
            'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
            'coverage_month' => 3,
            'coverage_year' => 2026,
            'submitted_at' => now(),
        ]);
    }

    public function test_a_race_between_two_concurrent_nil_submissions_is_caught_and_converted_to_a_friendly_error(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        // Simulate the actual race: right as this request's own
        // assertNoSettledReportFor() check has already passed (nothing
        // settled existed a moment ago) but before its insert lands, another
        // concurrent request for the SAME employer+period commits its own
        // settled report first — modeled by injecting the "other" insert
        // from within this request's own creating() event, immediately
        // before its write reaches the database.
        PlacementReportUpload::creating(function (PlacementReportUpload $model) use ($employer) {
            if ((int) $model->employer_id === $employer->employer_id
                && (int) $model->coverage_month === 3 && (int) $model->coverage_year === 2026) {
                PlacementReportUpload::withoutEvents(fn () => PlacementReportUpload::create([
                    'employer_id' => $employer->employer_id,
                    'original_filename' => 'concurrent.xlsx',
                    'stored_path' => null,
                    'row_count' => 0,
                    'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
                    'is_nil_report' => true,
                    'coverage_month' => 3,
                    'coverage_year' => 2026,
                    'submitted_at' => now(),
                ]));
            }
        });

        try {
            $this->postJson('/api/employer/placement-reports/nil', [
                'coverage_month' => 3, 'coverage_year' => 2026,
            ])
                ->assertStatus(422)
                ->assertJsonPath('errors.coverage_month.0', 'Another report for this employer and period was just submitted. Refresh and check your existing reports before trying again.');
        } finally {
            PlacementReportUpload::flushEventListeners();
        }
    }

    public function test_nil_report_records_that_nobody_was_hired(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->postJson('/api/employer/placement-reports/nil', [
            'coverage_month' => 3,
            'coverage_year' => 2026,
            'employer_remarks' => 'No hiring in March.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.is_nil_report', true)
            ->assertJsonPath('data.status', PlacementReportUpload::STATUS_PENDING_REVIEW)
            ->assertJsonPath('data.record_count', 0);

        // It settles the period like any other submission.
        $this->postJson('/api/employer/placement-reports/nil', [
            'coverage_month' => 3,
            'coverage_year' => 2026,
        ])->assertStatus(422);
    }

    public function test_coverage_month_is_required_and_cannot_be_in_the_future(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        $this->postJson('/api/employer/placement-reports', [
            'file' => $this->workbook(['Sheet1' => [['Ana', 'Santos', '2026-03-20', 'Encoder']]]),
        ])->assertStatus(422)->assertJsonValidationErrors(['coverage_month', 'coverage_year']);

        $future = Carbon::now()->addMonths(2);
        $this->postJson('/api/employer/placement-reports', [
            'file' => $this->workbook(['Sheet1' => [['Ana', 'Santos', '2026-03-20', 'Encoder']]]),
            'coverage_month' => $future->month,
            'coverage_year' => $future->year,
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.coverage_month.0', 'A placement report cannot cover a month that has not started yet.');
    }

    public function test_birth_date_separates_namesakes_and_ambiguity_is_left_for_an_admin(): void
    {
        // Two registered seekers share a name; only their birth dates differ.
        $this->seeker(201, 'Juan', 'Perez', 'Dela Cruz', '1998-05-04');
        $this->seeker(202, 'Juan', 'Reyes', 'Dela Cruz', '1990-11-20');
        $this->seeker(203, 'Maria', 'Lopez', 'Santos', '1995-02-14');

        $service = app(\App\Services\PlacementImportService::class);

        // Birth date supplied and matching exactly one candidate.
        $this->assertSame(
            ['seeker_id' => 202, 'confidence' => PlacementRecord::MATCH_EXACT],
            $service->matchSeeker(['first_name' => 'Juan', 'last_name' => 'DELA CRUZ', 'birth_date' => '1990-11-20']),
        );

        // No birth date to separate them — better unlinked than wrong.
        $this->assertSame(
            ['seeker_id' => null, 'confidence' => PlacementRecord::MATCH_AMBIGUOUS],
            $service->matchSeeker(['first_name' => 'juan', 'last_name' => 'delacruz']),
        );

        // A single hit with no birth date on the sheet is only probable.
        $this->assertSame(
            ['seeker_id' => 203, 'confidence' => PlacementRecord::MATCH_PROBABLE],
            $service->matchSeeker(['first_name' => 'Maria', 'last_name' => 'Santos']),
        );

        // A birth date that contradicts every candidate is evidence against.
        $this->assertSame(
            ['seeker_id' => null, 'confidence' => PlacementRecord::MATCH_NONE],
            $service->matchSeeker(['first_name' => 'Maria', 'last_name' => 'Santos', 'birth_date' => '1975-01-01']),
        );

        // Most reported hires are walk-ins who never registered — not an error.
        $this->assertSame(
            ['seeker_id' => null, 'confidence' => PlacementRecord::MATCH_NONE],
            $service->matchSeeker(['first_name' => 'Unknown', 'last_name' => 'Person']),
        );
    }

    public function test_hyphenated_and_punctuated_surnames_still_match_via_seeker_candidates(): void
    {
        $this->seeker(401, 'Juan', '', 'Dela-Cruz', '1998-05-04');

        $service = app(\App\Services\PlacementImportService::class);

        // The SQL side used to strip only spaces from the column, so a DB
        // name spelled "Dela-Cruz" never matched a reported hire spelled
        // "DelaCruz" even though normalizeName() (PHP) treats them as equal.
        $candidates = $service->seekerCandidates('Juan', 'DelaCruz');

        $this->assertCount(1, $candidates);
        $this->assertSame(401, $candidates->first()->seeker_id);
    }

    public function test_admin_can_correct_and_clear_a_seeker_link(): void
    {
        $employer = $this->employer();
        $admin = $this->admin();
        $this->seeker(301, 'Ana', 'Cruz', 'Santos', '1999-09-09');

        $upload = $this->submittedReport($employer, month: 3, year: 2026);
        $record = PlacementRecord::create([
            'upload_id' => $upload->id,
            'employer_id' => $employer->employer_id,
            'first_name' => 'Ana',
            'last_name' => 'Santos',
            'date_hired' => '2026-03-11',
            'position' => 'Encoder',
            'seeker_match_confidence' => PlacementRecord::MATCH_AMBIGUOUS,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/placement-reports/{$upload->id}/records/{$record->id}/candidates")
            ->assertOk()
            ->assertJsonPath('data.0.seeker_id', 301)
            ->assertJsonPath('data.0.name', 'Ana Cruz Santos');

        $this->postJson("/api/admin/placement-reports/{$upload->id}/records/{$record->id}/link", ['seeker_id' => 301])
            ->assertOk()
            ->assertJsonPath('data.linked_seeker_id', 301)
            ->assertJsonPath('data.seeker_match_confidence', PlacementRecord::MATCH_EXACT);

        $this->assertNotNull($record->fresh()->seeker_match_confirmed_at);

        $this->postJson("/api/admin/placement-reports/{$upload->id}/records/{$record->id}/link", ['seeker_id' => null])
            ->assertOk()
            ->assertJsonPath('data.linked_seeker_id', null)
            ->assertJsonPath('data.seeker_match_confidence', PlacementRecord::MATCH_NONE);
    }

    public function test_admin_confirmed_seeker_link_survives_a_resubmission_after_rejection(): void
    {
        $this->seeker(501, 'Ana', '', 'Santos', '1999-09-09');

        $employer = $this->employer();
        $admin = $this->admin();

        Sanctum::actingAs($employer);
        $file = $this->workbook(['MARCH' => [['Ana', 'Santos', '2026-03-10', 'Encoder']]]);
        $uploadId = $this->postJson('/api/employer/placement-reports', [
            'file' => $file, 'coverage_month' => 3, 'coverage_year' => 2026,
        ])->assertCreated()->json('data.id');

        $mapping = $this->getJson("/api/employer/placement-reports/{$uploadId}")->json('data.mapping');
        $this->postJson("/api/employer/placement-reports/{$uploadId}/preview", ['mapping' => $mapping])->assertOk();
        $this->postJson("/api/employer/placement-reports/{$uploadId}/submit")->assertOk();

        Sanctum::actingAs($admin);
        $recordId = PlacementRecord::where('upload_id', $uploadId)->firstOrFail()->id;
        $this->postJson("/api/admin/placement-reports/{$uploadId}/records/{$recordId}/link", ['seeker_id' => 501])
            ->assertOk();
        $this->postJson("/api/admin/placement-reports/{$uploadId}/reject", ['review_remarks' => 'Please fix an unrelated column.'])
            ->assertOk();

        Sanctum::actingAs($employer);
        // Resubmitting rebuilds every record from scratch via buildRecords() —
        // before the fix this reverted the admin's confirmed link straight
        // back to whatever the automatic matcher guessed.
        $this->postJson("/api/employer/placement-reports/{$uploadId}/preview", ['mapping' => $mapping])->assertOk();

        $record = PlacementRecord::where('upload_id', $uploadId)->firstOrFail();
        $this->assertSame(501, $record->seeker_id);
        $this->assertNotNull($record->seeker_match_confirmed_at);
        $this->assertSame(PlacementRecord::MATCH_EXACT, $record->seeker_match_confidence);
    }

    public function test_compliance_view_separates_submitted_nil_and_overdue_employers(): void
    {
        // Set the clock first: employers registered after a period closed were
        // never in a position to report on it, so they are excluded.
        Carbon::setTestNow('2026-03-01 09:00:00');

        try {
            $reported = $this->employer('reported@example.test', 'Reported Corp');
            $nil = $this->employer('nil@example.test', 'Nil Corp');
            $this->employer('silent@example.test', 'Silent Corp');
            $admin = $this->admin();

            $this->submittedReport($reported, month: 3, year: 2026);
            PlacementReportUpload::create([
                'employer_id' => $nil->employer_id,
                'original_filename' => 'No hires declared',
                'stored_path' => null,
                'row_count' => 0,
                'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
                'is_nil_report' => true,
                'coverage_month' => 3,
                'coverage_year' => 2026,
                'submitted_at' => now(),
            ]);

            Sanctum::actingAs($admin);

            // Well past the April deadline for the March period.
            Carbon::setTestNow('2026-05-01 09:00:00');

            $response = $this->getJson('/api/admin/placement-reports/compliance?coverage_month=3&coverage_year=2026')
                ->assertOk()
                ->assertJsonPath('due_date', '2026-04-10')
                ->assertJsonPath('totals.expected', 3)
                ->assertJsonPath('totals.submitted', 2)
                ->assertJsonPath('totals.nil_reports', 1)
                ->assertJsonPath('totals.overdue', 1);

            $states = collect($response->json('data'))->pluck('state', 'company_name');
            $this->assertSame(PlacementReportUpload::STATUS_PENDING_REVIEW, $states['Reported Corp']);
            $this->assertSame(PlacementReportUpload::STATUS_PENDING_REVIEW, $states['Nil Corp']);
            $this->assertSame('overdue', $states['Silent Corp']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_reminder_command_notifies_only_employers_with_nothing_submitted(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-03-01 09:00:00');

        try {
            $reported = $this->employer('did@example.test', 'Did Report Inc');
            $silent = $this->employer('didnt@example.test', 'Did Not Report Inc');
            $this->submittedReport($reported, month: 3, year: 2026);

            // Deadline for March 2026 is 10 April; the first reminder fires 3 days out.
            $this->artisan('placements:notify-missing', ['--date' => '2026-04-07'])->assertSuccessful();

            Notification::assertSentTo($silent, PlacementReportDue::class, function (PlacementReportDue $notification) {
                return $notification->coverageLabel === 'March 2026'
                    && $notification->dueDate === '2026-04-10'
                    && $notification->daysLeft === 3;
            });
            Notification::assertNotSentTo($reported, PlacementReportDue::class);

            // A date that matches no configured offset sends nothing.
            Notification::fake();
            $this->artisan('placements:notify-missing', ['--date' => '2026-04-08'])->assertSuccessful();
            Notification::assertNothingSent();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_due_date_falls_on_the_configured_day_of_the_following_month(): void
    {
        config(['placement_reports.deadline_day' => 15]);
        $compliance = app(PlacementComplianceService::class);

        $this->assertSame('2026-04-15', $compliance->dueDate(2026, 3)->toDateString());
        $this->assertSame('2027-01-15', $compliance->dueDate(2026, 12)->toDateString());

        // Clamped to the month length rather than overflowing into the next one.
        config(['placement_reports.deadline_day' => 31]);
        $this->assertSame('2026-02-28', app(PlacementComplianceService::class)->dueDate(2026, 1)->toDateString());
    }

    public function test_long_gender_and_civil_status_values_are_truncated_to_their_column_width(): void
    {
        $employer = $this->employer();
        Sanctum::actingAs($employer);

        // gender/civil_status are narrower than the 255-char default other
        // fields get — a longer value used to pass straight through and blow
        // up under MySQL strict mode instead of being capped like every
        // other field already is.
        $file = $this->workbookWithExtraColumns([
            'FIRST NAME' => 'Ana', 'LAST NAME' => 'Santos', 'DATE HIRED' => '2026-03-10', 'POSITION' => 'Encoder',
            'GENDER' => str_repeat('Female-identifying-nonbinary-descriptor ', 3),
            'CIVIL STATUS' => str_repeat('Married-with-a-very-long-legal-descriptor ', 3),
        ]);

        $uploadId = $this->postJson('/api/employer/placement-reports', [
            'file' => $file, 'coverage_month' => 3, 'coverage_year' => 2026,
        ])->assertCreated()->json('data.id');

        $mapping = $this->getJson("/api/employer/placement-reports/{$uploadId}")->json('data.mapping');

        $response = $this->postJson("/api/employer/placement-reports/{$uploadId}/preview", ['mapping' => $mapping])
            ->assertOk();

        $this->assertLessThanOrEqual(30, strlen($response->json('records.0.gender')));
        $this->assertLessThanOrEqual(40, strlen($response->json('records.0.civil_status')));
    }

    public function test_a_rejected_nil_declaration_can_be_resubmitted_directly(): void
    {
        $employer = $this->employer();
        $admin = $this->admin();

        Sanctum::actingAs($employer);
        $uploadId = $this->postJson('/api/employer/placement-reports/nil', [
            'coverage_month' => 3, 'coverage_year' => 2026,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/placement-reports/{$uploadId}/reject", ['review_remarks' => 'Please confirm with HR before we accept a nil month.'])
            ->assertOk();

        Sanctum::actingAs($employer);
        // Before the fix, submit() always required a column mapping — which a
        // nil declaration never has — so this was a dead end for the employer.
        $this->postJson("/api/employer/placement-reports/{$uploadId}/submit", [
            'employer_remarks' => 'Confirmed with HR: no hires in March.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PlacementReportUpload::STATUS_PENDING_REVIEW)
            ->assertJsonPath('data.is_nil_report', true);
    }

    public function test_compliance_excludes_an_employer_verified_after_the_period_closed(): void
    {
        Carbon::setTestNow('2026-04-01 09:00:00');

        try {
            // Registered in February but not verified by PESO until April —
            // after March had already closed. Keying eligibility off
            // created_at would retroactively brand them overdue for a period
            // they had no verified portal access to.
            $lateVerified = $this->employer('late@example.test', 'Late Verified Inc');
            $lateVerified->forceFill(['verified_at' => '2026-04-01 08:00:00', 'created_at' => '2026-02-01 08:00:00'])->save();

            $onTime = $this->employer('ontime@example.test', 'On Time Inc');
            $onTime->forceFill(['verified_at' => '2026-02-15 08:00:00', 'created_at' => '2026-02-01 08:00:00'])->save();

            $admin = $this->admin();
            Sanctum::actingAs($admin);

            $response = $this->getJson('/api/admin/placement-reports/compliance?coverage_month=3&coverage_year=2026')->assertOk();

            $companies = collect($response->json('data'))->pluck('company_name');
            $this->assertFalse($companies->contains('Late Verified Inc'));
            $this->assertTrue($companies->contains('On Time Inc'));
        } finally {
            Carbon::setTestNow();
        }
    }

    // ── Fixtures ─────────────────────────────────────────────────────────

    private function employer(string $email = 'employer@example.test', string $company = 'OneSource General Solutions'): Employer
    {
        return Employer::create([
            'email' => $email,
            'password' => 'password123',
            'company_name' => $company,
            'trade_name' => $company,
            'verification_status' => 'verified',
            'email_verified_at' => now(),
        ]);
    }

    private function admin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Admin',
            'email' => 'placement-admin@example.test',
            'password' => 'password123',
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function seeker(int $id, string $first, string $middle, string $last, string $birthDate): void
    {
        DB::table('job_seekers')->insert([
            'seeker_id' => $id,
            'first_name' => $first,
            'middle_name' => $middle,
            'last_name' => $last,
            'email' => strtolower($first).$id.'@example.test',
            'password' => 'password123',
            'date_of_birth' => $birthDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function submittedReport(Employer $employer, int $month, int $year): PlacementReportUpload
    {
        return PlacementReportUpload::create([
            'employer_id' => $employer->employer_id,
            'original_filename' => 'placements.xlsx',
            'stored_path' => null,
            'row_count' => 1,
            'status' => PlacementReportUpload::STATUS_PENDING_REVIEW,
            'coverage_month' => $month,
            'coverage_year' => $year,
            'submitted_at' => now(),
        ]);
    }

    /**
     * Build a real .xlsx fixture — PhpSpreadsheet has to be able to open it,
     * so a faked binary would not exercise anything.
     *
     * @param  array<string, array<int, array<int, string>>>  $sheets
     */
    private function workbook(array $sheets, bool $withBanner = false): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        foreach ($sheets as $title => $rows) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle($title);

            $grid = [];
            if ($withBanner) {
                $grid[] = ['ONESOURCE GENERAL SOLUTIONS INC.', null, null, null];
                $grid[] = [null, 'PESO URDANETA CITY - PLACEMENT REPORT', null, null];
            }
            $grid[] = ['FIRST NAME', 'LAST NAME', 'DATE HIRED', 'POSITION'];
            foreach ($rows as $row) {
                $grid[] = $row;
            }

            $sheet->fromArray($grid, null, 'A1');
        }

        $spreadsheet->setActiveSheetIndex(0);

        $path = tempnam(sys_get_temp_dir(), 'placement').'.xlsx';
        (new XlsxWriter($spreadsheet))->save($path);
        $this->tempFiles[] = $path;

        return new UploadedFile($path, 'placements.xlsx', null, null, true);
    }

    /**
     * Build a single-sheet workbook from an explicit header => value row, for
     * tests that need columns (gender, civil status, ...) the shared
     * workbook() fixture doesn't carry.
     *
     * @param  array<string, string>  $row
     */
    private function workbookWithExtraColumns(array $row): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([array_keys($row), array_values($row)], null, 'A1');

        $path = tempnam(sys_get_temp_dir(), 'placement').'.xlsx';
        (new XlsxWriter($spreadsheet))->save($path);
        $this->tempFiles[] = $path;

        return new UploadedFile($path, 'placements.xlsx', null, null, true);
    }

    private function createTables(): void
    {
        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('company_name')->nullable();
            $table->string('trade_name')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('verification_status')->default('pending');
            $table->timestamp('verified_at')->nullable();
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
            $table->string('email')->unique();
            $table->string('password');
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->timestamps();
        });

        Schema::create('placement_report_uploads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->string('original_filename');
            $table->string('stored_path')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->json('detected_headers')->nullable();
            $table->json('sample_rows')->nullable();
            $table->json('sheet_names')->nullable();
            $table->string('selected_sheet')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->string('status', 30)->default('pending_mapping');
            $table->boolean('is_nil_report')->default(false);
            $table->unsignedTinyInteger('coverage_month')->nullable();
            $table->unsignedSmallInteger('coverage_year')->nullable();
            $table->text('employer_remarks')->nullable();
            $table->unsignedBigInteger('reviewed_by_admin_id')->nullable();
            $table->text('review_remarks')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // Mirrors the production migration's race-proof uniqueness
            // constraint: NULL (a non-blocking status) never collides, so
            // only pending_review/approved rows for the same employer+period
            // are ever compared against each other.
            $table->string('settlement_key', 60)->nullable()->storedAs(
                "CASE WHEN status IN ('pending_review', 'approved') AND coverage_year IS NOT NULL AND coverage_month IS NOT NULL "
                ."THEN employer_id || '-' || coverage_year || '-' || coverage_month ELSE NULL END"
            );
            $table->unique('settlement_key');
        });

        Schema::create('placement_report_mappings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->string('source_column');
            $table->string('target_field', 60)->nullable();
            $table->timestamps();
            $table->unique(['upload_id', 'source_column']);
        });

        Schema::create('placement_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('civil_status', 40)->nullable();
            $table->unsignedSmallInteger('age')->nullable();
            $table->date('birth_date')->nullable();
            $table->date('date_hired')->nullable();
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->string('address', 500)->nullable();
            $table->string('educational_attainment')->nullable();
            $table->string('assigned_company')->nullable();
            $table->unsignedBigInteger('seeker_id')->nullable();
            $table->string('seeker_match_confidence', 20)->nullable();
            $table->unsignedBigInteger('seeker_match_confirmed_by')->nullable();
            $table->timestamp('seeker_match_confirmed_at')->nullable();
            $table->json('raw_row')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }
}
