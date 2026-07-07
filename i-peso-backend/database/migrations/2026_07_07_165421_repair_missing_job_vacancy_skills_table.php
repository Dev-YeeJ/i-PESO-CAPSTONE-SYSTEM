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
        if (!Schema::hasTable('job_vacancy_skills')) {
            Schema::create('job_vacancy_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id');
                $table->foreignId('skill_id')
                    ->constrained('skill_catalog_entries')
                    ->cascadeOnDelete();
                $table->string('skill_type', 20);
                $table->string('original_name', 150);
                $table->decimal('weight', 5, 2)->default(1);
                $table->timestamps();

                $table->foreign('post_id')
                    ->references('post_id')
                    ->on('job_vacancies')
                    ->cascadeOnDelete();
                $table->unique(['post_id', 'skill_id', 'skill_type']);
                $table->index(['skill_id', 'skill_type']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_vacancy_skills');
    }
};
