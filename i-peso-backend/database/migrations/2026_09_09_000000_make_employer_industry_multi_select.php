<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Industry becomes a required multi-select — widen the column from a
     * single string to a JSON array and fold any existing scalar value into
     * a one-item array so no data is lost.
     */
    public function up(): void
    {
        // Backfill BEFORE changing the column type. MySQL's json column type
        // adds a CHECK constraint that validates every existing row the
        // instant the ALTER runs — any row still holding a plain scalar
        // string (not valid JSON, e.g. "Retail") makes the type change
        // itself fail outright. Converting values while the column is still
        // a plain varchar avoids that; SQLite has no such constraint, which
        // is why this only surfaced against real MySQL production data.
        $existing = DB::table('employers')
            ->whereNotNull('industry')
            ->where('industry', '!=', '')
            ->select('employer_id', 'industry')
            ->get();

        foreach ($existing as $row) {
            $decoded = json_decode($row->industry, true);
            // Only wrap values that aren't already a JSON array — keeps this
            // migration idempotent if it's ever re-run after a partial failure.
            if (! is_array($decoded)) {
                DB::table('employers')
                    ->where('employer_id', $row->employer_id)
                    ->update(['industry' => json_encode([$row->industry])]);
            }
        }

        Schema::table('employers', function (Blueprint $table) {
            $table->json('industry')->nullable()->change();
        });
    }

    public function down(): void
    {
        $existing = DB::table('employers')
            ->whereNotNull('industry')
            ->select('employer_id', 'industry')
            ->get();

        Schema::table('employers', function (Blueprint $table) {
            $table->string('industry', 100)->nullable()->change();
        });

        foreach ($existing as $row) {
            $decoded = json_decode($row->industry, true);
            DB::table('employers')
                ->where('employer_id', $row->employer_id)
                ->update(['industry' => is_array($decoded) ? ($decoded[0] ?? null) : $row->industry]);
        }
    }
};
