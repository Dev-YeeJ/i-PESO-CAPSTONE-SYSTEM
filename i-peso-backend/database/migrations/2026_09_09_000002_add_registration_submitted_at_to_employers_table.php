<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `verification_status` is set to 'pending' the instant an employer
     * account is created (Step 1 of the onboarding wizard) and never
     * changes until final submission — so it can't distinguish "still
     * filling out the form" from "submitted, awaiting PESO review". Every
     * admin-facing employer list/queue was showing in-progress
     * registrations as if they were ready for review.
     *
     * This column is set only at the true final step (representative info +
     * government ID, see EmployerRegistrationController::registerStep4()),
     * and admin queries now require it to be non-null.
     */
    public function up(): void
    {
        Schema::table('employers', function (Blueprint $table) {
            $table->timestamp('registration_submitted_at')->nullable()->after('verification_status');
        });

        // Backfill: anyone already verified/rejected must have submitted (those
        // states are unreachable otherwise), and anyone still pending with
        // representative info on file (only ever set at final submission)
        // also already submitted — approximate the timestamp with updated_at
        // so existing genuinely-submitted employers don't vanish from the
        // admin queue the moment this filter goes live.
        DB::table('employers')
            ->where(function ($query) {
                $query->whereIn('verification_status', ['verified', 'rejected'])
                    ->orWhere(function ($sub) {
                        $sub->where('verification_status', 'pending')
                            ->whereNotNull('representative_first_name')
                            ->where('representative_first_name', '!=', '');
                    });
            })
            ->update(['registration_submitted_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('employers', function (Blueprint $table) {
            $table->dropColumn('registration_submitted_at');
        });
    }
};
