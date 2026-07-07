<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEXES = [
        'job_seekers' => [
            'job_seekers_profile_created_idx' => ['profile_completed', 'created_at'],
            'job_seekers_employment_created_idx' => ['employment_status', 'created_at'],
            'job_seekers_province_idx' => ['address_province'],
            'job_seekers_city_idx' => ['address_municipality_city'],
            'job_seekers_barangay_idx' => ['address_barangay'],
        ],
        'employers' => [
            'employers_type_created_idx' => ['company_type', 'created_at'],
            'employers_province_idx' => ['province'],
            'employers_city_idx' => ['city_municipality'],
            'employers_barangay_idx' => ['barangay'],
        ],
        'applications' => [
            'applications_seeker_status_idx' => ['seeker_id', 'status'],
            'applications_status_changed_idx' => ['status', 'status_changed_at'],
        ],
        'job_vacancies' => [
            'vacancies_employer_status_idx' => ['employer_id', 'status'],
            'vacancies_status_deadline_idx' => ['status', 'application_deadline'],
        ],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($indexes as $name => $columns) {
                if ($this->hasColumns($table, $columns) && ! Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($columns, $name));
                }
            }
        }
    }

    public function down(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach (array_keys($indexes) as $name) {
                if (Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($name));
                }
            }
        }
    }

    private function hasColumns(string $table, array $columns): bool
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }
};
