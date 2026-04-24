<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_fairs', function (Blueprint $table) {
            $table->id('job_fair_id');
            // FK → administrators.admin_id
            $table->unsignedBigInteger('admin_id');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('venue', 500);
            $table->date('event_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['upcoming', 'ongoing', 'completed', 'cancelled'])
                  ->default('upcoming');
            $table->timestamps();

            $table->foreign('admin_id')
                  ->references('admin_id')
                  ->on('administrators')
                  ->onDelete('cascade');

            $table->index('event_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_fairs');
    }
};