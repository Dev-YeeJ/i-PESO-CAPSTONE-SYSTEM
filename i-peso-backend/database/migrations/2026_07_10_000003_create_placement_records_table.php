<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('placement_records')) {
            return;
        }

        Schema::create('placement_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->unsignedBigInteger('employer_id');
            // Normalized standard fields (all nullable — employer templates vary).
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('civil_status', 40)->nullable();
            $table->unsignedSmallInteger('age')->nullable();
            $table->date('birth_date')->nullable();
            $table->date('date_hired')->nullable();
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->string('address', 500)->nullable();
            $table->string('educational_attainment')->nullable();
            $table->string('assigned_company')->nullable();
            // Best-effort link back to a registered seeker (fuzzy name match).
            $table->unsignedBigInteger('seeker_id')->nullable();
            // The untouched source row, preserved for audit / re-mapping.
            $table->json('raw_row')->nullable();
            $table->timestamps();

            $table->foreign('upload_id')->references('id')->on('placement_report_uploads')->cascadeOnDelete();
            $table->index('employer_id');
            $table->index('date_hired');
            $table->index('seeker_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_records');
    }
};
