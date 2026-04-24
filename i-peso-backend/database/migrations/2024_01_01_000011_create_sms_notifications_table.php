<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_notifications', function (Blueprint $table) {
            $table->id('notification_id');
            // Polymorphic columns — recipient can be JobSeeker, Employer, or Administrator
            // recipient_type stores the model class: "App\Models\JobSeeker"
            // recipient_id stores the primary key of that model
            $table->string('recipient_type', 255);
            $table->unsignedBigInteger('recipient_id');
            $table->string('phone_number', 20);
            // e.g. "otp", "application_update", "interview_reminder"
            $table->string('message_type', 100);
            $table->text('content');
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // Composite index for polymorphic lookups
            $table->index(['recipient_type', 'recipient_id'], 'sms_recipient_index');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_notifications');
    }
};