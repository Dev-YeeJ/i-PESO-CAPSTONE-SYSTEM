<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds the "Affidavit of Undertaking" document type — required, alongside
     * the existing PRPA/DMW-POEA license and the already-defined but
     * previously-unused no_pending_case_certificate, for recruitment agencies
     * registering as an employer. See Employer::getRequiredDocuments().
     */
    public function up(): void
    {
        // MySQL-only syntax — Laravel's schema builder has no cross-driver way
        // to add an enum value. SQLite (the test suite's driver) has no enum
        // type at all, so this is a no-op there rather than a fatal error,
        // matching the guard already used in
        // make_seeker_id_non_auto_increment for the same reason.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE employer_documents MODIFY document_type ENUM(
                'mayors_permit',
                'bir_certificate',
                'philJobnet_proof',
                'dti_certificate',
                'sec_certificate',
                'prpa_license',
                'dme_poea_license',
                'no_pending_case_certificate',
                'company_logo',
                'government_id',
                'authorization_letter',
                'affidavit_of_undertaking',
                'other'
            )");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE employer_documents MODIFY document_type ENUM(
                'mayors_permit',
                'bir_certificate',
                'philJobnet_proof',
                'dti_certificate',
                'sec_certificate',
                'prpa_license',
                'dme_poea_license',
                'no_pending_case_certificate',
                'company_logo',
                'government_id',
                'authorization_letter',
                'other'
            )");
        }
    }
};
