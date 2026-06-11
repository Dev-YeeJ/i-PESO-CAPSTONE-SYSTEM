<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->string('educ_attainment', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Keep this nullable so rolling back does not fail for partially completed profiles.
    }
};
