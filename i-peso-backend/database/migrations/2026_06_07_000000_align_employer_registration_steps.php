<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasRepresentativeOwner = Schema::hasColumn('employers', 'representative_is_owner');
        $hasTin = Schema::hasColumn('employers', 'tin');

        Schema::table('employers', function (Blueprint $table) use ($hasRepresentativeOwner, $hasTin) {
            $table->string('company_name')->nullable()->change();
            $table->string('representative_name')->nullable()->change();
            $table->string('mobile_number', 20)->nullable()->change();
            $table->string('complete_address', 500)->nullable()->change();
            $table->string('industry_type', 100)->nullable()->change();

            if (! $hasTin) {
                $table->string('tin', 20)->nullable()->after('company_name');
            }

            if (! $hasRepresentativeOwner) {
                $table->boolean('representative_is_owner')
                    ->default(false)
                    ->after('representative_contact_number');
            }
        });
    }

    public function down(): void
    {
        $hasRepresentativeOwner = Schema::hasColumn('employers', 'representative_is_owner');

        Schema::table('employers', function (Blueprint $table) use ($hasRepresentativeOwner) {
            if ($hasRepresentativeOwner) {
                $table->dropColumn('representative_is_owner');
            }
        });
    }
};
