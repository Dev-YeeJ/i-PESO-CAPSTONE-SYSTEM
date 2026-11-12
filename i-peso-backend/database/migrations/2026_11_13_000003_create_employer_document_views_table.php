<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-account record of which staff member has opened which employer document.
 *
 * employer_documents.viewed_at / staff_viewed_at are single shared columns, so
 * the first staff member to open a file flipped it to "Viewed" for every other
 * account — and the finalize guard ("view every required document before
 * deciding") could be satisfied by a colleague's view. This table makes the
 * admin-side "Viewed" state, and that guard, belong to the account that
 * actually opened the file.
 *
 * The shared columns stay: they drive the employer-facing "PESO has opened
 * your document" indicator, where "anyone at PESO" is the right meaning.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employer_document_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')
                ->constrained('employer_documents', 'document_id')
                ->cascadeOnDelete();
            $table->foreignId('administrator_id')
                ->constrained('administrators', 'admin_id')
                ->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->unique(['document_id', 'administrator_id']);
            $table->index('administrator_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employer_document_views');
    }
};
