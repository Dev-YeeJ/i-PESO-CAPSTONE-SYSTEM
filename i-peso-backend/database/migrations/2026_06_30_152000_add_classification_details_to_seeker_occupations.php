<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->string('broad_field', 100)->nullable()->after('general_term');
            $table->string('role_function', 100)->nullable()->after('broad_field');
            $table->unsignedTinyInteger('confidence')->nullable()->after('role_function');
            $table->string('source', 30)->nullable()->after('confidence');
        });
    }

    public function down(): void
    {
        Schema::table('seeker_occupations', function (Blueprint $table) {
            $table->dropColumn(['broad_field', 'role_function', 'confidence', 'source']);
        });
    }
};
