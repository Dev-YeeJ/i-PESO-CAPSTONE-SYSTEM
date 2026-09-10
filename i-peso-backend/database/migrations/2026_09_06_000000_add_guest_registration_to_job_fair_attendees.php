<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lets PESO staff encode a job-fair attendee who has no i-peso account at
     * all (e.g. only filled the physical/Google Form pre-registration) —
     * seeker_id becomes optional and the guest_* columns hold what would
     * otherwise have come from the seeker's profile.
     */
    public function up(): void
    {
        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->dropForeign(['seeker_id']);
        });

        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->unsignedBigInteger('seeker_id')->nullable()->change();
            $table->string('guest_name')->nullable()->after('seeker_id');
            $table->string('guest_mobile_number', 40)->nullable()->after('guest_name');
            $table->string('guest_email')->nullable()->after('guest_mobile_number');
            $table->string('guest_educ_attainment', 100)->nullable()->after('guest_email');
            $table->string('guest_preferred_job')->nullable()->after('guest_educ_attainment');
        });

        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->foreign('seeker_id')
                ->references('seeker_id')
                ->on('job_seekers')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->dropForeign(['seeker_id']);
        });

        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->dropColumn(['guest_name', 'guest_mobile_number', 'guest_email', 'guest_educ_attainment', 'guest_preferred_job']);
            $table->unsignedBigInteger('seeker_id')->nullable(false)->change();
        });

        Schema::table('job_fair_attendees', function (Blueprint $table) {
            $table->foreign('seeker_id')
                ->references('seeker_id')
                ->on('job_seekers')
                ->cascadeOnDelete();
        });
    }
};
