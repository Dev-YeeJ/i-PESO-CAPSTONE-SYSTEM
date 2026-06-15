<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('occupations', function (Blueprint $table) {
            $table->string('external_uri')->nullable()->unique()->after('psoc_code');
            $table->string('classification_code', 50)->nullable()->after('external_uri');
            $table->string('isco_group', 10)->nullable()->after('classification_code');

            $table->index(['source', 'classification_code']);
        });
    }

    public function down(): void
    {
        Schema::table('occupations', function (Blueprint $table) {
            $table->dropIndex(['source', 'classification_code']);
            $table->dropUnique(['external_uri']);
            $table->dropColumn([
                'external_uri',
                'classification_code',
                'isco_group',
            ]);
        });
    }
};
