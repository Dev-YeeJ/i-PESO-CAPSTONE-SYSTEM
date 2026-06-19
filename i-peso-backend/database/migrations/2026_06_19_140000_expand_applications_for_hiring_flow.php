<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (! Schema::hasColumn('applications', 'status_changed_at')) {
                $table->timestamp('status_changed_at')->nullable()->after('status');
            }

            if (! Schema::hasColumn('applications', 'status_changed_by')) {
                $table->unsignedBigInteger('status_changed_by')->nullable()->after('status_changed_at');
            }

            if (! Schema::hasColumn('applications', 'placement_start_date')) {
                $table->date('placement_start_date')->nullable()->after('employer_remarks');
            }

            if (! Schema::hasColumn('applications', 'placement_salary')) {
                $table->decimal('placement_salary', 12, 2)->nullable()->after('placement_start_date');
            }

            if (! Schema::hasColumn('applications', 'placement_captured_at')) {
                $table->timestamp('placement_captured_at')->nullable()->after('placement_salary');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            foreach ([
                'placement_captured_at',
                'placement_salary',
                'placement_start_date',
                'status_changed_by',
                'status_changed_at',
            ] as $column) {
                if (Schema::hasColumn('applications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
