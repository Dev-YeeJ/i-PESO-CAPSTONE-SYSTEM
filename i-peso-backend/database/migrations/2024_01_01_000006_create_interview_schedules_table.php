<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interview_schedules', function (Blueprint $table) {
            $table->id('interview_id');
            // FK → applications.apply_id (one application → one interview)
            $table->unsignedBigInteger('apply_id')->unique();
            $table->enum('mode_of_interview', ['face_to_face', 'online', 'phone']);
            $table->dateTime('schedule');
            // venue for face-to-face OR meeting link for online
            $table->string('venue_or_link', 500)->nullable();
            $table->text('instructions')->nullable();
            $table->enum('status', [
                'scheduled',
                'completed',
                'cancelled',
                'rescheduled'
            ])->default('scheduled');
            $table->timestamps();

            $table->foreign('apply_id')
                  ->references('apply_id')
                  ->on('applications')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_schedules');
    }
};