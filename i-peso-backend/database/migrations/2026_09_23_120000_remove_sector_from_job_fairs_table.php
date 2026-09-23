<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('job_fairs', 'sector')) {
            Schema::table('job_fairs', function (Blueprint $table) {
                $table->dropColumn('sector');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('job_fairs', 'sector')) {
            Schema::table('job_fairs', function (Blueprint $table) {
                $table->string('sector', 20)->nullable()->after('venue');
            });
        }
    }
};