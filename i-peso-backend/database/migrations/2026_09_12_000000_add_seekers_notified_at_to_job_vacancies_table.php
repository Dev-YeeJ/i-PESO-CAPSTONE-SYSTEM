<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            // One-shot guard for the "new job vacancy" seeker notification — mirrors
            // job_fairs.published_at, which JobFairController::publish() uses the same way to
            // stop a later edit/status change from re-notifying everyone who already saw it.
            $table->timestamp('seekers_notified_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn('seekers_notified_at');
        });
    }
};
