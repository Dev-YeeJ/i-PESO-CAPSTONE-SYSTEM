<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_catalog_entries', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('normalized_name', 150);
            $table->string('category', 20);
            $table->string('source', 30);
            $table->string('element_id', 20)->nullable();
            $table->unsignedInteger('occupation_count')->default(0);
            $table->boolean('is_hot')->default(false);
            $table->boolean('is_in_demand')->default(false);
            $table->string('version', 20)->default('30.3');
            $table->timestamps();

            $table->unique(['category', 'normalized_name']);
            $table->index(['category', 'occupation_count']);
            $table->index('normalized_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skill_catalog_entries');
    }
};
