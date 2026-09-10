<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * `company_type` is a real MySQL enum (see
     * 2026_06_06_000000_update_employers_table_for_registration.php) —
     * adding 'government_agency' to the PHP-level validation lists
     * (AuthController, EmployerRegistrationController) earlier without also
     * widening this enum left the column itself rejecting the new value:
     * production hit "SQLSTATE[01000]: Data truncated for column
     * 'company_type'" the moment someone tried to register as one.
     */
    public function up(): void
    {
        // MySQL-only syntax — same guard used in
        // add_affidavit_to_employer_documents_enum for the same reason.
        // SQLite (the test suite's driver) has no enum type at all.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE employers MODIFY company_type ENUM(
                'sole_proprietorship',
                'corporation_partnership',
                'local_recruitment_agency',
                'overseas_recruitment_agency',
                'government_agency'
            ) NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE employers MODIFY company_type ENUM(
                'sole_proprietorship',
                'corporation_partnership',
                'local_recruitment_agency',
                'overseas_recruitment_agency'
            ) NULL");
        }
    }
};
