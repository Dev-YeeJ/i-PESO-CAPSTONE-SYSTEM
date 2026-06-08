<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->string('verification_status', 20)
                ->default('pending')
                ->after('is_verified')
                ->index();
        });

        DB::table('job_seekers')
            ->where('is_verified', true)
            ->update(['verification_status' => 'verified']);
    }

    public function down(): void
    {
        Schema::table('job_seekers', function (Blueprint $table) {
            $table->dropIndex(['verification_status']);
            $table->dropColumn('verification_status');
        });
    }
};
