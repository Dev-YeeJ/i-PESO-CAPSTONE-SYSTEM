<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the system administrator delete a staff account for good.
 *
 * A deleted account is never removed with a real DELETE: job fairs, programs
 * and analytics reports cascade-delete with their staff member, and every
 * review, approval and audit entry would lose who did it. Instead the row is
 * kept as a tombstone (deleted_at set, contact details and password wiped,
 * name kept for the records) and hidden from the whole app.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('administrators', 'deleted_at')) {
            Schema::table('administrators', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('administrators', 'deleted_at')) {
            Schema::table('administrators', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
