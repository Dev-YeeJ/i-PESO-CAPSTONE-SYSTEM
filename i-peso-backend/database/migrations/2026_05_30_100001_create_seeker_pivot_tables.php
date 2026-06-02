<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ===== DISABILITIES (Pivot) =====
        Schema::create('seeker_disabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')->onDelete('cascade');
            $table->enum('disability_type', ['visual', 'hearing', 'speech', 'mental', 'physical', 'others', 'none']);
            $table->string('disability_specification', 255)->nullable(); // If Others
            $table->timestamps();
            $table->unique(['seeker_id', 'disability_type']);
        });

        // ===== PREFERRED OCCUPATIONS (3 choices) =====
        Schema::create('seeker_occupations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')->onDelete('cascade');
            $table->string('occupation_title', 255); // ISCO title or custom
            $table->unsignedTinyInteger('preference_order'); // 1, 2, or 3
            $table->timestamps();
            $table->unique(['seeker_id', 'preference_order']);
        });

        // ===== LANGUAGE PROFICIENCY (Matrix: Language × 4 Skills) =====
        Schema::create('seeker_languages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')->onDelete('cascade');
            
            $table->enum('language', [
                'english',
                'filipino',
                'mandarin',
                'spanish',
                'japanese',
                'korean',
                'arabic',
                'french',
                'german',
                'others'
            ]);
            $table->string('language_other', 100)->nullable(); // If Others
            
            // Proficiency booleans (what they can do)
            $table->boolean('can_read')->default(false);
            $table->boolean('can_write')->default(false);
            $table->boolean('can_speak')->default(false);
            $table->boolean('can_understand')->default(false);
            
            $table->timestamps();
            $table->unique(['seeker_id', 'language']);
        });

        // ===== WORK LOCATION PREFERENCES =====
        Schema::create('seeker_work_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seeker_id')->constrained('job_seekers', 'seeker_id')->onDelete('cascade');
            
            $table->enum('location_type', ['local', 'overseas']);
            $table->string('location_name', 255); // City, municipality, or country
            $table->string('location_code', 10)->nullable(); // PSGC or ISO code
            
            $table->timestamps();
            $table->unique(['seeker_id', 'location_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seeker_work_locations');
        Schema::dropIfExists('seeker_languages');
        Schema::dropIfExists('seeker_occupations');
        Schema::dropIfExists('seeker_disabilities');
    }
};
