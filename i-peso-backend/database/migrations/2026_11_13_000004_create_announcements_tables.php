<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Announcement module (docs/announcement-module-plan.md).
 *
 * One row per announcement; readers *pull* what is live for their role, so
 * publishing never fans out a row per user. announcement_reads only gets a
 * row when someone actually opens or dismisses an announcement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->text('body');
            $table->string('category', 30)->default('general');
            $table->string('priority', 20)->default('normal');
            $table->string('audience', 20)->default('all');
            $table->string('status', 20)->default('draft');
            $table->boolean('is_pinned')->default(false);
            $table->timestamp('publish_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('first_published_at')->nullable();
            $table->string('link_label', 60)->nullable();
            $table->string('link_url', 500)->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->string('attachment_mime', 100)->nullable();
            $table->boolean('notify_users')->default(false);
            $table->timestamp('notified_at')->nullable();
            $table->unsignedInteger('notified_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->foreignId('published_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamps();

            // The reader feed's hot path: live rows for an audience.
            $table->index(['status', 'audience', 'publish_at']);
        });

        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->string('reader_type');
            $table->unsignedBigInteger('reader_id');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->unique(['announcement_id', 'reader_type', 'reader_id']);
            $table->index(['reader_type', 'reader_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_reads');
        Schema::dropIfExists('announcements');
    }
};
