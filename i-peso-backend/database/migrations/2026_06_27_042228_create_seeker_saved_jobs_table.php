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
        Schema::create('seeker_saved_jobs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->unsignedBigInteger('vacancy_id');
            $table->timestamps();

            $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->onDelete('cascade');
            $table->foreign('vacancy_id')->references('post_id')->on('job_vacancies')->onDelete('cascade');
            
            $table->unique(['seeker_id', 'vacancy_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seeker_saved_jobs');
    }
};
