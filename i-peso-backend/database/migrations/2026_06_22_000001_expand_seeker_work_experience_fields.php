<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('seeker_work_experiences')) {
            return;
        }

        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            if (! Schema::hasColumn('seeker_work_experiences', 'responsibilities')) {
                $table->text('responsibilities')->nullable()->after('position');
            }
        });

        if (Schema::hasColumn('seeker_work_experiences', 'employment_status')) {
            $driver = DB::getDriverName();

            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::statement('ALTER TABLE seeker_work_experiences MODIFY employment_status VARCHAR(100) NULL');
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('seeker_work_experiences')) {
            return;
        }

        Schema::table('seeker_work_experiences', function (Blueprint $table) {
            if (Schema::hasColumn('seeker_work_experiences', 'responsibilities')) {
                $table->dropColumn('responsibilities');
            }
        });
    }
};
