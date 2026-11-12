<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration → Site Content (docs/content-module-plan.md): the standing
 * information of the portal — office details, landing page text, FAQs and
 * the versioned policy pages — that used to be hard-coded.
 */
return new class extends Migration
{
    public function up(): void
    {
        // One row per editable section ('office', 'landing'); values are validated
        // by App\Support\SiteContentRegistry, which also supplies the defaults.
        Schema::create('site_contents', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60)->unique();
            $table->json('value');
            // Bumped on every save — the edit-conflict token.
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('updated_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamps();
        });

        // A snapshot after every save, for history and one-click restore.
        Schema::create('site_content_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('content_type', 30);   // section | faq
            $table->string('content_key', 60);    // 'office' | 'landing' | faq id
            $table->json('value');
            $table->json('changed_fields')->nullable();
            $table->string('action', 30)->default('saved'); // saved | reset | restored | created
            $table->foreignId('changed_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index(['content_type', 'content_key', 'created_at']);
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question', 200);
            $table->text('answer');
            $table->string('audience', 20)->default('everyone'); // everyone | seekers | employers
            $table->string('topic', 40)->default('office');
            $table->string('link_label', 60)->nullable();
            $table->string('link_url', 500)->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_published', 'audience', 'topic', 'sort_order']);
        });

        // Privacy Policy, Terms of Service, Review Guidelines. Never edited in
        // place: each change is a new version with its own effective date.
        Schema::create('policy_versions', function (Blueprint $table) {
            $table->id();
            $table->string('policy', 40);         // privacy-policy | terms-of-service | review-guidelines
            $table->unsignedInteger('version');
            $table->string('status', 20)->default('draft'); // draft | published
            // Version 1 is the text that shipped with the portal (resources/policies/*.json).
            $table->boolean('is_builtin')->default(false);
            $table->date('effective_at')->nullable();
            $table->json('summary')->nullable();
            $table->json('sections');
            $table->string('change_note', 200)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->foreignId('published_by')->nullable()->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['policy', 'version']);
            $table->index(['policy', 'status', 'effective_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('policy_versions');
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('site_content_revisions');
        Schema::dropIfExists('site_contents');
    }
};
