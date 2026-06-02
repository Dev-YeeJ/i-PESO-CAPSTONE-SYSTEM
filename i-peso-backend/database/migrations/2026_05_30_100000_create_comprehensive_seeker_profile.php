<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            // ===== STEP 1: PERSONAL INFORMATION & ADDRESS =====
            
            // Name fields
            $table->string('middle_name', 100)->nullable()->after('last_name');
            $table->string('suffix', 20)->nullable()->after('middle_name'); // Sr., Jr., III
            
            // Demographics
            $table->date('date_of_birth')->nullable();
            $table->enum('sex', ['male', 'female'])->nullable();
            $table->enum('civil_status', ['single', 'married', 'widowed', 'separated'])->nullable();
            $table->string('religion', 100)->nullable();
            $table->decimal('height_ft', 4, 2)->nullable(); // Height in feet
            $table->string('tin', 20)->nullable();
            
            // Present Address (4 components)
            $table->string('address_house_street', 255)->nullable();
            $table->string('address_barangay', 100)->nullable();
            $table->string('address_municipality_city', 100)->nullable();
            $table->string('address_province', 100)->nullable();
            
            // ===== STEP 2: EDUCATION & DEMOGRAPHICS =====
            
            // Already has educ_attainment
            $table->boolean('is_4ps_beneficiary')->default(false);
            $table->string('household_id_4ps', 50)->nullable(); // If 4Ps = Yes
            
            // ===== STEP 3: EMPLOYMENT STATUS =====
            
            // Main employment status
            $table->enum('employment_status', ['employed', 'unemployed'])->nullable();
            
            // If Employed
            $table->enum('employment_type', ['wage_employed', 'self_employed'])->nullable();
            $table->enum('self_employed_type', [
                'fisherman_fisherfolk',
                'vendor_retailer',
                'home_based_worker',
                'transport',
                'domestic_worker',
                'freelancer',
                'artisan_craft_worker',
                'others'
            ])->nullable(); // Only if employment_type = self_employed
            $table->string('self_employed_type_others', 255)->nullable();
            
            // If Unemployed
            $table->unsignedInteger('unemployment_months')->nullable();
            $table->enum('unemployment_reason', [
                'fresh_graduate',
                'finished_contract',
                'resigned',
                'retired',
                'terminated_local',
                'terminated_abroad',
                'terminated_calamity',
                'others'
            ])->nullable();
            $table->string('unemployment_reason_others', 255)->nullable();
            $table->string('unemployment_terminated_country', 100)->nullable(); // If terminated abroad
            
            // OFW Status
            $table->boolean('is_ofw')->default(false);
            $table->string('ofw_country', 100)->nullable(); // If OFW = Yes
            
            // Former OFW
            $table->boolean('is_former_ofw')->default(false);
            $table->string('former_ofw_country', 100)->nullable();
            $table->date('former_ofw_return_date')->nullable(); // Month/Year of return
            
            // ===== STEP 4: JOB PREFERENCES =====
            
            // Preferred Occupations (will use pivot table for 3 choices)
            // (see seeker_occupations pivot table migration)
            
            // Work Type
            $table->enum('work_type_preference', ['part_time', 'full_time'])->nullable();
            
            // Preferred Work Location
            $table->enum('preferred_work_location', ['local', 'overseas'])->nullable();
            $table->json('preferred_locations_details')->nullable(); // Array of cities/countries
            
            // ===== TRACKING =====
            
            $table->boolean('profile_completed')->default(false);
            $table->timestamp('profile_completed_at')->nullable();
            $table->json('form_validation_state')->nullable(); // Track which steps are validated
        });
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropColumn([
                'middle_name', 'suffix', 'date_of_birth', 'sex', 'civil_status',
                'religion', 'height_ft', 'tin',
                'address_house_street', 'address_barangay', 'address_municipality_city', 'address_province',
                'is_4ps_beneficiary', 'household_id_4ps',
                'employment_status', 'employment_type', 'self_employed_type', 'self_employed_type_others',
                'unemployment_months', 'unemployment_reason', 'unemployment_reason_others', 'unemployment_terminated_country',
                'is_ofw', 'ofw_country', 'is_former_ofw', 'former_ofw_country', 'former_ofw_return_date',
                'work_type_preference', 'preferred_work_location', 'preferred_locations_details',
                'profile_completed', 'profile_completed_at', 'form_validation_state',
            ]);
        });
    }
};
