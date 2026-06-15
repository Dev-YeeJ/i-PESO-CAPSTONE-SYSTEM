<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupation_general_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occupation_id')->constrained('occupations')->cascadeOnDelete();
            $table->string('term');
            $table->string('normalized_term');
            $table->string('language', 10)->default('en');
            $table->string('source', 30)->default('local_peso');
            $table->unsignedSmallInteger('priority')->default(100);
            $table->timestamps();

            $table->unique(
                ['occupation_id', 'normalized_term', 'language'],
                'occupation_general_term_unique'
            );
            $table->index(['normalized_term', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occupation_general_terms');
    }
};
