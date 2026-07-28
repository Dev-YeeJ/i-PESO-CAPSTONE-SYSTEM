<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Manual override rows for SPRS indicators the system cannot auto-compute
 * (LMI individuals reached, Career Guidance advocacies, AIR-TIP participants).
 * Keyed to the saved analytics_reports row.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sprs_manual_adjustments')) {
            return;
        }

        Schema::create('sprs_manual_adjustments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('analytics_report_id');
            $table->string('indicator_key', 60);
            $table->string('label');
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('female')->default(0);
            $table->timestamps();

            $table->index('analytics_report_id');
            $table->unique(['analytics_report_id', 'indicator_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprs_manual_adjustments');
    }
};
