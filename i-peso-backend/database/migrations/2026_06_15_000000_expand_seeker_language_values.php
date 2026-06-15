<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_languages', function (Blueprint $table) {
            $table->string('language', 100)->change();
        });
    }

    public function down(): void
    {
        Schema::table('seeker_languages', function (Blueprint $table) {
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
                'others',
            ])->change();
        });
    }
};
