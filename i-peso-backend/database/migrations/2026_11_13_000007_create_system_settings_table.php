<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration → System Settings: switches, deadlines and limits PESO can
 * change without a developer (App\Support\SystemSettingsRegistry). Only
 * settings that were changed get a row; everything else uses its default.
 * Secrets (API keys) never live here — they stay in the server's .env.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
