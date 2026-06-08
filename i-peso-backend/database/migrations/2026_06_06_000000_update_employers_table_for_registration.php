<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds all required fields for the 4-step employer registration flow
     */
    public function up(): void
    {
        Schema::table('employers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->change();
            $table->string('representative_name')->nullable()->change();
            $table->string('mobile_number', 20)->nullable()->change();
            $table->string('complete_address', 500)->nullable()->change();
            $table->string('industry_type', 100)->nullable()->change();

            // Step 1: Account Setup & Company Type
            $table->enum('company_type', [
                'sole_proprietorship',
                'corporation_partnership',
                'local_recruitment_agency',
                'overseas_recruitment_agency',
            ])->nullable()->after('password');

            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending')->after('company_type');

            // Step 2: Company Profile (expanding existing fields)
            $table->string('tin', 20)->nullable()->after('company_name');
            $table->string('trade_name')->nullable()->after('company_name'); // DBA - Doing Business As
            $table->string('industry')->nullable()->after('industry_type'); // Standardized DOLE industries
            $table->enum('company_size', ['micro', 'small', 'medium', 'large'])->nullable()->after('industry');

            // Address components (from PSGC cascade)
            $table->string('province')->nullable()->after('complete_address');
            $table->string('city_municipality')->nullable()->after('province');
            $table->string('barangay')->nullable()->after('city_municipality');
            $table->string('house_unit_street')->nullable()->after('barangay');

            $table->longText('company_description')->nullable()->after('house_unit_street');
            $table->string('company_logo')->nullable()->after('company_description');

            // Step 4: Authorized Representative Details (expanding existing fields)
            $table->string('representative_first_name')->nullable()->after('representative_name');
            $table->string('representative_middle_name')->nullable()->after('representative_first_name');
            $table->string('representative_last_name')->nullable()->after('representative_middle_name');
            $table->string('representative_designation')->nullable()->after('representative_last_name');
            $table->string('representative_contact_number')->nullable()->after('representative_designation');

            // Admin review fields
            $table->timestamp('verified_at')->nullable()->after('verification_status');
            $table->text('rejection_reason')->nullable()->after('verified_at');
            $table->unsignedBigInteger('verified_by_admin_id')->nullable()->after('rejection_reason');

            // Soft delete for rejected/inactive accounts
            $table->softDeletes()->after('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employers', function (Blueprint $table) {
            $table->dropColumn([
                'company_type',
                'verification_status',
                'tin',
                'trade_name',
                'industry',
                'company_size',
                'province',
                'city_municipality',
                'barangay',
                'house_unit_street',
                'company_description',
                'company_logo',
                'representative_first_name',
                'representative_middle_name',
                'representative_last_name',
                'representative_designation',
                'representative_contact_number',
                'verified_at',
                'rejection_reason',
                'verified_by_admin_id',
            ]);
            $table->dropSoftDeletes();
        });
    }
};
