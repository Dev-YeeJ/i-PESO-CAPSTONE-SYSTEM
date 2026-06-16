<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            // Add optional GPA field
            $table->decimal('gpa', 3, 2)
                ->nullable()
                ->after('course_strand')
                ->comment('Grade Point Average (0.0 - 4.0 scale)');

            // Add honors/academic distinctions
            $table->string('academic_honors')
                ->nullable()
                ->after('gpa')
                ->comment('Academic honors or distinctions (e.g., Cum Laude, Magna Cum Laude)');

            // Track courses/majors completed (for partial degrees)
            $table->text('completed_courses')
                ->nullable()
                ->after('academic_honors')
                ->comment('JSON array of completed courses/subjects if still studying');

            // Verification status
            $table->boolean('is_verified')
                ->default(false)
                ->after('completed_courses')
                ->comment('Whether this education has been verified');

            // School name/institution
            $table->string('institution_name')
                ->nullable()
                ->after('is_verified')
                ->comment('Name of the educational institution');

            $table->index('is_verified');
        });
    }

    public function down(): void
    {
        Schema::table('seeker_educations', function (Blueprint $table) {
            $table->dropColumn(['gpa', 'academic_honors', 'completed_courses', 'is_verified', 'institution_name']);
        });
    }
};
