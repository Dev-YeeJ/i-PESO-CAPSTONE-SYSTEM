<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_fair_result_reports', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('submitted_by_employer_id');
            $table->unsignedBigInteger('reviewed_by_admin_id')->nullable()->after('status');
            $table->text('review_remarks')->nullable()->after('reviewed_by_admin_id');
            
            $table->foreign('reviewed_by_admin_id')->references('admin_id')->on('administrators')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_fair_result_reports', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by_admin_id']);
            $table->dropColumn(['status', 'reviewed_by_admin_id', 'review_remarks']);
        });
    }
};
