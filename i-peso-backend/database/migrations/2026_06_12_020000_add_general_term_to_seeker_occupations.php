<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->string('general_term')->nullable()->after('occupation_id');
            $table->index('general_term');
        });
    }

    public function down(): void
    {
        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->dropIndex(['general_term']);
            $table->dropColumn('general_term');
        });
    }
};
