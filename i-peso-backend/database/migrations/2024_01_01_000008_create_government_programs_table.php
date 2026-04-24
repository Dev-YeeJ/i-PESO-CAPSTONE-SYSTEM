<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('government_programs', function (Blueprint $table) {
            $table->id('program_id');
            // FK → administrators.admin_id
            $table->unsignedBigInteger('admin_id');
            // e.g. "SPES", "TUPAD"
            $table->string('program_name', 255);
            $table->text('description')->nullable();
            $table->text('target_beneficiaries')->nullable();
            $table->dateTime('schedule')->nullable();
            $table->unsignedInteger('slot_limit')->default(0);
            $table->enum('status', ['open', 'closed', 'ongoing', 'completed'])
                  ->default('open');
            $table->timestamps();

            $table->foreign('admin_id')
                  ->references('admin_id')
                  ->on('administrators')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('government_programs');
    }
};