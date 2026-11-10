<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Verified Mutual Feedback System.
 *
 *  - employer_reviews: job seekers' reviews of employers, each tied to a real
 *    application (Recruitment Experience) or a verified hire (Employment
 *    Experience). Anonymous to the public.
 *  - employer_review_replies: the employer's one public reply per review.
 *  - employer_review_flags: reports and disputes about a review, plus the
 *    automatic content checks, for PESO to resolve.
 *  - worker_feedback: an employer's private feedback about someone they
 *    hired. Never public; only PESO staff and the worker can read it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employer_reviews')) {
            Schema::create('employer_reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('employer_id');
                $table->unsignedBigInteger('seeker_id');
                // The verified interaction behind the review: an application, or a
                // placement-report hire PESO linked to this seeker.
                $table->unsignedBigInteger('application_id')->nullable();
                $table->unsignedBigInteger('placement_record_id')->nullable();
                $table->string('type', 20); // recruitment | employment
                $table->json('ratings');    // {aspect: 1-5}
                $table->boolean('recommend')->nullable();
                $table->text('comment')->nullable();
                // Recruitment review of an application the employer never answered:
                // only communication and posting accuracy can be rated.
                $table->boolean('limited')->default(false);
                $table->string('status', 20)->default('published'); // published | held | hidden
                $table->string('hold_reason', 255)->nullable();
                $table->text('moderation_note')->nullable();
                $table->unsignedBigInteger('moderated_by')->nullable();
                $table->timestamp('moderated_at')->nullable();
                $table->timestamp('edited_at')->nullable();
                $table->string('submitted_ip', 45)->nullable();
                $table->timestamps();

                // One review of each type per interaction.
                $table->unique(['type', 'application_id']);
                $table->unique(['type', 'placement_record_id']);
                $table->index(['employer_id', 'status', 'type']);
                $table->index(['seeker_id', 'created_at']);

                $table->foreign('employer_id')->references('employer_id')->on('employers')->cascadeOnDelete();
                $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->cascadeOnDelete();
                $table->foreign('application_id')->references('apply_id')->on('applications')->nullOnDelete();
                $table->foreign('moderated_by')->references('admin_id')->on('administrators')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('employer_review_replies')) {
            Schema::create('employer_review_replies', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('review_id')->unique();
                $table->unsignedBigInteger('employer_id');
                $table->text('body');
                $table->string('status', 20)->default('published'); // published | hidden
                $table->timestamp('edited_at')->nullable();
                $table->timestamps();

                $table->foreign('review_id')->references('id')->on('employer_reviews')->cascadeOnDelete();
                $table->foreign('employer_id')->references('employer_id')->on('employers')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('employer_review_flags')) {
            Schema::create('employer_review_flags', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('review_id');
                // employer (a dispute), seeker (another user's report) or system (automatic check)
                $table->string('reporter_type', 20);
                $table->unsignedBigInteger('reporter_id')->nullable();
                $table->string('reason', 40);
                $table->text('details')->nullable();
                $table->string('status', 20)->default('open'); // open | upheld | dismissed
                $table->text('resolution_note')->nullable();
                $table->unsignedBigInteger('resolved_by')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'created_at']);
                $table->foreign('review_id')->references('id')->on('employer_reviews')->cascadeOnDelete();
                $table->foreign('resolved_by')->references('admin_id')->on('administrators')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('worker_feedback')) {
            Schema::create('worker_feedback', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('employer_id');
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('application_id')->nullable();
                $table->unsignedBigInteger('placement_record_id')->nullable();
                $table->json('ratings'); // professionalism, communication, reliability, job_performance
                $table->string('would_rehire', 10); // yes | maybe | no
                $table->text('comment')->nullable();
                $table->string('status', 20)->default('visible'); // visible | hidden (by PESO)
                $table->text('moderation_note')->nullable();
                $table->unsignedBigInteger('moderated_by')->nullable();
                $table->timestamp('moderated_at')->nullable();
                $table->timestamp('edited_at')->nullable();
                $table->timestamps();

                $table->unique('application_id');
                $table->unique('placement_record_id');
                $table->index(['seeker_id', 'created_at']);

                $table->foreign('employer_id')->references('employer_id')->on('employers')->cascadeOnDelete();
                $table->foreign('seeker_id')->references('seeker_id')->on('job_seekers')->cascadeOnDelete();
                $table->foreign('application_id')->references('apply_id')->on('applications')->nullOnDelete();
                $table->foreign('moderated_by')->references('admin_id')->on('administrators')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employer_review_flags');
        Schema::dropIfExists('employer_review_replies');
        Schema::dropIfExists('worker_feedback');
        Schema::dropIfExists('employer_reviews');
    }
};
