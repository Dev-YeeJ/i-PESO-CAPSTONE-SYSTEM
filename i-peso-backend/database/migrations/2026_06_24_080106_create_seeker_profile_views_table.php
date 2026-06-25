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
        Schema::create('seeker_profile_views', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('seeker_id');
            $table->unsignedBigInteger('job_vacancy_id')->nullable();
            $table->string('source')->default('search'); // e.g., 'search', 'application'
            $table->timestamps();

            $table->foreign('employer_id')->references('employer_id')->on('employers')->onDelete('cascade');
            $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->onDelete('cascade');
            $table->foreign('job_vacancy_id')->references('post_id')->on('job_vacancies')->onDelete('cascade');
            
            $table->index(['employer_id', 'seeker_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seeker_profile_views');
    }
};
