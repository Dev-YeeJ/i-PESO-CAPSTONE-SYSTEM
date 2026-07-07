<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('seeker_certificates')) {
            return;
        }

        Schema::create('seeker_certificates', function (Blueprint $table) {
            $table->id('certificate_id');
            $table->foreignId('seeker_id')
                ->constrained('job_seekers', 'seeker_id')
                ->cascadeOnDelete();
            $table->foreignId('program_application_id')->nullable()->unique()
                ->constrained('program_applications', 'prog_apply_id')
                ->nullOnDelete();
            $table->foreignId('training_id')->nullable()
                ->constrained('seeker_trainings')
                ->nullOnDelete();
            $table->string('title');
            $table->string('issuing_body');
            $table->string('category', 50)->nullable();
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->string('credential_number', 100)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['seeker_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seeker_certificates');
    }
};
