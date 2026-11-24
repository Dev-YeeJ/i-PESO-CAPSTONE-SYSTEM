<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Employers are no longer asked "Would you hire them again?" when they give
 * feedback about a hire. New feedback leaves would_rehire empty; answers given
 * before are kept in the table but no longer shown or counted anywhere.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('worker_feedback', 'would_rehire')) {
            return;
        }

        Schema::table('worker_feedback', function (Blueprint $table) {
            $table->string('would_rehire', 10)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('worker_feedback', 'would_rehire')) {
            return;
        }

        // Rows saved without an answer get "maybe" so the column can be required again.
        DB::table('worker_feedback')->whereNull('would_rehire')->update(['would_rehire' => 'maybe']);

        Schema::table('worker_feedback', function (Blueprint $table) {
            $table->string('would_rehire', 10)->nullable(false)->change();
        });
    }
};
