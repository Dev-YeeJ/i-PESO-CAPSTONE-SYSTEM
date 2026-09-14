<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brings the digitized Confirmation Slip back in line with the actual PESO
 * paper form: it has no email field and no "will conduct onsite interview" /
 * "logistics requests" fields (those were invented for the digital version),
 * but does ask for the representative's Position/s, which the digital form
 * never captured.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_fair_confirmation_slips', function (Blueprint $table) {
            $table->string('representative_position')->nullable()->after('representative_1_contact');
            $table->dropColumn(['email', 'will_conduct_onsite_interview', 'logistics_requests']);
        });
    }

    public function down(): void
    {
        Schema::table('job_fair_confirmation_slips', function (Blueprint $table) {
            $table->dropColumn('representative_position');
            $table->string('email')->nullable();
            $table->boolean('will_conduct_onsite_interview')->default(false);
            $table->text('logistics_requests')->nullable();
        });
    }
};
