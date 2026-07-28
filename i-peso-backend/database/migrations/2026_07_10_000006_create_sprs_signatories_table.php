<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prepared-by / checked-by / approved-by sign-off block for a saved SPRS report,
 * mirroring the signatory footer of the DOLE SPRS paper form.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sprs_signatories')) {
            return;
        }

        Schema::create('sprs_signatories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('analytics_report_id');
            $table->string('role', 30); // prepared_by | checked_by | approved_by
            $table->string('name');
            $table->string('position')->nullable();
            $table->timestamps();

            $table->index('analytics_report_id');
            $table->unique(['analytics_report_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprs_signatories');
    }
};
