<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_reports', function (Blueprint $table) {
            $table->id('report_id');
            // FK → administrators.admin_id
            $table->unsignedBigInteger('admin_id');
            $table->string('title', 255);
            // e.g. "placement", "registration", "programs", "vacancies"
            $table->string('report_category', 100);
            $table->date('coverage_start');
            $table->date('coverage_end');
            // Full JSON blob of computed analytics data
            $table->json('data_summary');
            $table->timestamps();

            $table->foreign('admin_id')
                  ->references('admin_id')
                  ->on('administrators')
                  ->onDelete('cascade');

            $table->index('report_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_reports');
    }
};