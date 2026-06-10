<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupations', function (Blueprint $table) {
            $table->id();
            $table->string('psoc_code', 30)->unique();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->text('search_terms')->nullable();
            $table->string('version', 20)->default('2012');
            $table->string('source', 30)->default('psa');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('title');
            $table->index(['is_active', 'title']);
        });

        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->foreignId('occupation_id')
                ->nullable()
                ->after('seeker_id')
                ->constrained('occupations')
                ->nullOnDelete();
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->foreignId('occupation_id')
                ->nullable()
                ->after('employer_id')
                ->constrained('occupations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('occupation_id');
        });

        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('occupation_id');
        });

        Schema::dropIfExists('occupations');
    }
};
