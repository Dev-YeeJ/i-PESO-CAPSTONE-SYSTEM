<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupation_title_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('suggested_occupation_id')
                ->nullable()
                ->constrained('occupations')
                ->nullOnDelete();
            $table->string('raw_title');
            $table->string('normalized_title')->unique();
            $table->string('source', 30)->default('jobdatalake');
            $table->string('status', 30)->default('pending');
            $table->string('match_reason', 50)->nullable();
            $table->decimal('match_confidence', 4, 3)->nullable();
            $table->unsignedInteger('occurrences')->default(1);
            $table->string('sample_company')->nullable();
            $table->json('metadata')->nullable();
            $table->dateTime('first_seen_at');
            $table->dateTime('last_seen_at');
            $table->dateTime('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'match_confidence']);
            $table->index(['suggested_occupation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occupation_title_candidates');
    }
};
