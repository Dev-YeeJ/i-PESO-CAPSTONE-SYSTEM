<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Converts old skill_type enum values to new ones:
     * - 'hard_skill' → 'technical'
     * - 'soft_skill' → 'soft'
     * - 'dole_standard' → unchanged
     */
    public function up(): void
    {
        // Check if the table exists and has data with old enum values
        if (Schema::hasTable('seeker_skills')) {
            // Update old enum values to new ones (backward compatibility)
            DB::table('seeker_skills')
                ->where('skill_type', 'hard_skill')
                ->update(['skill_type' => 'technical']);
            
            DB::table('seeker_skills')
                ->where('skill_type', 'soft_skill')
                ->update(['skill_type' => 'soft']);
        }

        // Modify the enum column to accept only the new values
        // Note: This requires altering the table, which differs by database driver
        if (Schema::hasTable('seeker_skills')) {
            Schema::table('seeker_skills', function (Blueprint $table) {
                // For MySQL, we need to change the enum column
                // This syntax works for MySQL 5.7+
                DB::statement("ALTER TABLE seeker_skills MODIFY skill_type ENUM('dole_standard', 'technical', 'soft')");
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert the enum values back to old ones
        if (Schema::hasTable('seeker_skills')) {
            DB::table('seeker_skills')
                ->where('skill_type', 'technical')
                ->update(['skill_type' => 'hard_skill']);
            
            DB::table('seeker_skills')
                ->where('skill_type', 'soft')
                ->update(['skill_type' => 'soft_skill']);

            // Restore the old enum column
            DB::statement("ALTER TABLE seeker_skills MODIFY skill_type ENUM('dole_standard', 'hard_skill', 'soft_skill')");
        }
    }
};
