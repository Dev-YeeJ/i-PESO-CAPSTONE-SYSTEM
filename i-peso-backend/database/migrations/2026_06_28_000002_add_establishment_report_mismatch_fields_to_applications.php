<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (! Schema::hasColumn('applications', 'employer_mismatch_reason_code')) {
                $table->string('employer_mismatch_reason_code', 80)->nullable()->after('dole_mismatch_code');
            }
            if (! Schema::hasColumn('applications', 'seeker_mismatch_reason_code')) {
                $table->string('seeker_mismatch_reason_code', 80)->nullable()->after('employer_mismatch_reason_code');
            }
            if (! Schema::hasColumn('applications', 'mismatch_reason_details')) {
                $table->text('mismatch_reason_details')->nullable()->after('seeker_mismatch_reason_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $columns = collect([
                'employer_mismatch_reason_code',
                'seeker_mismatch_reason_code',
                'mismatch_reason_details',
            ])->filter(fn (string $column) => Schema::hasColumn('applications', $column))->all();

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
