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
        Schema::create('seeker_skills', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $table->string('skill_name');
            // Updated enum values to match frontend:
            // - 'dole_standard': Official DOLE vocational skills (Section VIII of NSRP form)
            // - 'technical': Technical/Professional/Hard skills (custom, not on official form)
            // - 'soft': Soft/Interpersonal skills (custom, not on official form)
            $table->enum('skill_type', ['dole_standard', 'technical', 'soft']);
            $table->timestamps();

            // Foreign key constraint with cascade delete
            $table->foreign('seeker_id')
                ->references('seeker_id')
                ->on('job_seekers')
                ->onDelete('cascade');

            // Composite index for faster queries
            $table->index(['seeker_id', 'skill_type']);
            $table->index('skill_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seeker_skills');
    }
};
