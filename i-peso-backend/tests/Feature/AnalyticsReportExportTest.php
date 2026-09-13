<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\AnalyticsReport;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Every generated analytics report previously had no way to leave the
 * on-screen view — only the fixed-form SPRS report had a PDF export. This
 * covers the new generic export(), which has to work for an arbitrarily
 * nested data_summary shape (scalars, nested objects, and lists of rows),
 * not just one report category's known structure.
 */
class AnalyticsReportExportTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createTables();
    }

    public function test_export_produces_a_pdf_and_a_csv_from_nested_report_data(): void
    {
        $admin = Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Admin', 'email' => 'reports-admin@example.test',
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $report = AnalyticsReport::create([
            'admin_id' => $admin->admin_id,
            'title' => 'Registration Report - March 2026',
            'report_category' => 'registration',
            'coverage_start' => '2026-03-01',
            'coverage_end' => '2026-03-31',
            'data_summary' => [
                'total_registered' => 42,
                'registrations_by_month' => [
                    ['month' => '2026-03', 'count' => 42],
                ],
                'demographics' => [
                    'employer_verification' => ['verified' => 10, 'pending' => 2],
                ],
            ],
        ]);

        Sanctum::actingAs($admin);

        $pdf = $this->getJson("/api/admin/reports/{$report->report_id}/export?format=pdf")->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $pdf->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $pdf->getContent());

        $csv = $this->getJson("/api/admin/reports/{$report->report_id}/export?format=csv")->assertOk();
        $this->assertStringContainsString('text/csv', (string) $csv->headers->get('content-type'));
        $content = $csv->streamedContent();
        $this->assertStringContainsString('Total Registered', $content);
        $this->assertStringContainsString('42', $content);
        $this->assertStringContainsString('Month', $content);
        $this->assertStringContainsString('Verified', $content);
    }

    public function test_export_requires_an_administrator(): void
    {
        $report = AnalyticsReport::create([
            'admin_id' => 1, 'title' => 'x', 'report_category' => 'registration',
            'coverage_start' => '2026-03-01', 'coverage_end' => '2026-03-31', 'data_summary' => [],
        ]);

        $this->getJson("/api/admin/reports/{$report->report_id}/export")->assertUnauthorized();
    }

    private function createTables(): void
    {
        Schema::create('administrators', function (Blueprint $t) {
            $t->id('admin_id');
            $t->string('first_name');
            $t->string('last_name');
            $t->string('email')->unique();
            $t->string('password');
            $t->string('role')->nullable();
            $t->string('status')->nullable();
            $t->timestamp('email_verified_at')->nullable();
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('analytics_reports', function (Blueprint $t) {
            $t->id('report_id');
            $t->unsignedBigInteger('admin_id');
            $t->string('title');
            $t->string('report_category');
            $t->date('coverage_start');
            $t->date('coverage_end');
            $t->json('data_summary');
            $t->string('status')->nullable();
            $t->timestamps();
        });
    }
}
