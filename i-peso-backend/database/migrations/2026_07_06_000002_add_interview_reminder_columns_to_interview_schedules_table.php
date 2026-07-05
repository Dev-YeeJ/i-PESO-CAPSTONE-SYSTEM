<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interview_schedules', function (Blueprint $table) {
            if (! Schema::hasColumn('interview_schedules', 'interview_reminder_24h_sent_at')) {
                $table->timestamp('interview_reminder_24h_sent_at')->nullable();
            }

            if (! Schema::hasColumn('interview_schedules', 'interview_reminder_1h_sent_at')) {
                $table->timestamp('interview_reminder_1h_sent_at')->nullable();
            }

            if (! Schema::hasColumn('interview_schedules', 'interview_reminder_15m_sent_at')) {
                $table->timestamp('interview_reminder_15m_sent_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('interview_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('interview_schedules', 'interview_reminder_15m_sent_at')) {
                $table->dropColumn('interview_reminder_15m_sent_at');
            }

            if (Schema::hasColumn('interview_schedules', 'interview_reminder_1h_sent_at')) {
                $table->dropColumn('interview_reminder_1h_sent_at');
            }

            if (Schema::hasColumn('interview_schedules', 'interview_reminder_24h_sent_at')) {
                $table->dropColumn('interview_reminder_24h_sent_at');
            }
        });
    }
};
