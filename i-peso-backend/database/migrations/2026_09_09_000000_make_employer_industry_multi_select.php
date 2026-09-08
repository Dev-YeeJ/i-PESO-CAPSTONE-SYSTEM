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
        $existing = DB::table('employers')
            ->whereNotNull('industry')
            ->where('industry', '!=', '')
            ->select('employer_id', 'industry')
            ->get();

        Schema::table('employers', function (Blueprint $table) {
            $table->json('industry')->nullable()->change();
        });

        foreach ($existing as $row) {
            DB::table('employers')
                ->where('employer_id', $row->employer_id)
                ->update(['industry' => json_encode([$row->industry])]);
        }
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
