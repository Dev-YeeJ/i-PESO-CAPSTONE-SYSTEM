<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            $table->dropColumn([
                'short_description',
                'target_beneficiaries',
                'citizen_charter_steps',
                'required_documents',
                'contact_person',
                'contact_email',
                'contact_phone'
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('government_programs', function (Blueprint $table) {
            $table->text('short_description')->nullable();
            $table->text('target_beneficiaries')->nullable();
            $table->json('citizen_charter_steps')->nullable();
            $table->json('required_documents')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
        });
    }
};
