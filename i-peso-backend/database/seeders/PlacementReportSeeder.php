<?php

namespace Database\Seeders;

use App\Models\Employer;
use App\Models\PlacementRecord;
use App\Models\PlacementReportUpload;
use Illuminate\Database\Seeder;

class PlacementReportSeeder extends Seeder
{
    /**
     * Seeds one approved demo placement report so the Admin review screen and the
     * SPRS "job applicants placed" total have data to show at defense. Skips
     * gracefully when no employer exists yet.
     */
    public function run(): void
    {
        $employer = Employer::query()->first();
        if (! $employer) {
            $this->command?->warn('PlacementReportSeeder skipped — no employer found. Register an employer first.');

            return;
        }

        if (PlacementReportUpload::query()->where('employer_id', $employer->employer_id)->exists()) {
            return;
        }

        $upload = PlacementReportUpload::create([
            'employer_id' => $employer->employer_id,
            'original_filename' => 'sample-placement-report.csv',
            'stored_path' => 'placement_reports/demo/sample-placement-report.csv',
            'mime_type' => 'text/csv',
            'file_size' => 512,
            'detected_headers' => ['FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'Gender', 'Civil Status', 'Age', 'Educational Attainment', 'DATE HIRED', 'POSITION'],
            'sample_rows' => [],
            'row_count' => 3,
            'status' => PlacementReportUpload::STATUS_APPROVED,
            'coverage_month' => 3,
            'coverage_year' => 2026,
            'employer_remarks' => 'March placements — demo data.',
            'reviewed_at' => now(),
            'submitted_at' => now(),
        ]);

        $rows = [
            ['first_name' => 'Judy Ann', 'middle_name' => 'Guerrero', 'last_name' => 'Salu', 'gender' => 'Female', 'civil_status' => 'Single', 'age' => 24, 'educational_attainment' => 'College Graduate', 'date_hired' => '2026-03-19', 'position' => 'Office Clerk'],
            ['first_name' => 'Mark Anthony', 'middle_name' => 'Cruz', 'last_name' => 'Reyes', 'gender' => 'Male', 'civil_status' => 'Married', 'age' => 31, 'educational_attainment' => 'College Graduate', 'date_hired' => '2026-03-20', 'position' => 'Warehouse Staff'],
            ['first_name' => 'Kristine', 'middle_name' => 'Bautista', 'last_name' => 'Lim', 'gender' => 'Female', 'civil_status' => 'Single', 'age' => 22, 'educational_attainment' => 'Senior High School Graduate', 'date_hired' => '2026-03-21', 'position' => 'Data Encoder'],
        ];

        foreach ($rows as $row) {
            PlacementRecord::create(array_merge($row, [
                'upload_id' => $upload->id,
                'employer_id' => $employer->employer_id,
                'raw_row' => $row,
            ]));
        }

        $this->command?->info("PlacementReportSeeder: seeded 3 approved placement records for employer #{$employer->employer_id}.");
    }
}
