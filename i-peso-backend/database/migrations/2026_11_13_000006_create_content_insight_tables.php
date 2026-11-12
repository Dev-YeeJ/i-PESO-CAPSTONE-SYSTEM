<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Content Modules → Insights (docs/content-module-plan.md §9): what readers
 * tell PESO about the Help content, so staff know what to write next.
 *
 * Nothing here identifies a person: votes carry a one-way hash only to stop
 * double voting, and search terms / chatbot questions are stored with
 * emails, phone numbers and long digit runs removed, and are pruned after
 * 90 days.
 */
return new class extends Migration
{
    public function up(): void
    {
        // "Was this helpful?" — one vote per reader per FAQ (a changed mind updates it).
        Schema::create('faq_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faq_id')->constrained('faqs')->cascadeOnDelete();
            $table->boolean('helpful');
            $table->string('reader_hash', 64);
            $table->string('source', 20)->default('public'); // public | seeker | employer
            $table->timestamps();
            $table->unique(['faq_id', 'reader_hash']);
        });

        // Help-page searches that found nothing.
        Schema::create('help_search_misses', function (Blueprint $table) {
            $table->id();
            $table->string('term', 100);
            $table->string('normalized', 100)->index();
            $table->string('source', 20)->default('public');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });

        // Questions the assistant could not answer from what it knows.
        Schema::create('chatbot_gaps', function (Blueprint $table) {
            $table->id();
            $table->string('question', 300);
            $table->string('normalized', 191)->index();
            $table->string('audience', 20)->default('guest'); // guest | seeker | employer
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_gaps');
        Schema::dropIfExists('help_search_misses');
        Schema::dropIfExists('faq_feedback');
    }
};
