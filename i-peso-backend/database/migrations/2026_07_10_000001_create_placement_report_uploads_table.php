<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('placement_report_uploads')) {
            return;
        }

        Schema::create('placement_report_uploads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->string('original_filename');
            $table->string('stored_path');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            // Detected header row + a few sample rows, kept so the mapping UI can
            // re-render without re-parsing the file on every request.
            $table->json('detected_headers')->nullable();
            $table->json('sample_rows')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            // pending_mapping -> pending_review -> approved | rejected
            $table->string('status', 30)->default('pending_mapping');
            $table->unsignedTinyInteger('coverage_month')->nullable();
            $table->unsignedSmallInteger('coverage_year')->nullable();
            $table->text('employer_remarks')->nullable();
            $table->unsignedBigInteger('reviewed_by_admin_id')->nullable();
            $table->text('review_remarks')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['employer_id', 'status']);
            $table->index(['coverage_year', 'coverage_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_report_uploads');
    }
};
