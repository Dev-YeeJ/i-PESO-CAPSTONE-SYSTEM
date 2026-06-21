<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->string('source', 40)->default('system')->after('skill_type');
            $table->boolean('is_official')->default(false)->after('source');
            $table->boolean('is_recommended')->default(false)->after('is_official');
            $table->decimal('priority_score', 5, 2)->nullable()->after('is_recommended');
            $table->index(['source', 'is_official'], 'seeker_skills_source_official_index');
        });

        DB::table('seeker_skills')
            ->where('skill_type', 'dole_standard')
            ->update(['source' => 'dole', 'is_official' => true]);
    }

    public function down(): void
    {
        Schema::table('seeker_skills', function (Blueprint $table) {
            $table->dropIndex('seeker_skills_source_official_index');
            $table->dropColumn(['source', 'is_official', 'is_recommended', 'priority_score']);
        });
    }
};
