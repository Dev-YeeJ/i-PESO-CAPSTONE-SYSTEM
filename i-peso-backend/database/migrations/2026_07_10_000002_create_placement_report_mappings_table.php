<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('placement_report_mappings')) {
            return;
        }

        Schema::create('placement_report_mappings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            // The exact header text as it appeared in the employer's file.
            $table->string('source_column');
            // One of PlacementRecord::MAPPABLE_FIELDS, or null when the employer
            // chooses to ignore a column.
            $table->string('target_field', 60)->nullable();
            $table->timestamps();

            $table->foreign('upload_id')->references('id')->on('placement_report_uploads')->cascadeOnDelete();
            $table->unique(['upload_id', 'source_column']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_report_mappings');
    }
};
