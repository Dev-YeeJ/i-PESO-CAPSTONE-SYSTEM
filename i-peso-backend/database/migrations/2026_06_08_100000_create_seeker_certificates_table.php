<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seeker_certificates', function (Blueprint $table) {
            $table->id('certificate_id');
            $table->foreignId('seeker_id')
                ->constrained('job_seekers', 'seeker_id')
                ->cascadeOnDelete();
            $table->string('title');
            $table->string('issuing_body');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->date('issued_at')->nullable();
            $table->timestamps();

            $table->index(['seeker_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seeker_certificates');
    }
};
