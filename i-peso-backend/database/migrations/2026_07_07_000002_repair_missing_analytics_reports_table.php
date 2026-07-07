<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('analytics_reports')) {
            return;
        }

        Schema::create('analytics_reports', function (Blueprint $table) {
            $table->id('report_id');
            $table->unsignedBigInteger('admin_id');
            $table->string('title');
            $table->string('report_category', 100);
            $table->date('coverage_start');
            $table->date('coverage_end');
            $table->json('data_summary');
            $table->string('status', 30)->nullable();
            $table->timestamps();
            $table->foreign('admin_id')->references('admin_id')->on('administrators')->cascadeOnDelete();
            $table->index('report_category');
        });
    }

    public function down(): void
    {
        // Compatibility repair is intentionally non-destructive.
    }
};
