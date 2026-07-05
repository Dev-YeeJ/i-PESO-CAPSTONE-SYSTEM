<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seeker_certificates', function (Blueprint $table) {
            if (! Schema::hasColumn('seeker_certificates', 'category')) {
                $table->string('category', 50)->nullable()->after('issuing_body');
            }
            if (! Schema::hasColumn('seeker_certificates', 'expires_at')) {
                $table->date('expires_at')->nullable()->after('issued_at');
            }
            if (! Schema::hasColumn('seeker_certificates', 'credential_number')) {
                $table->string('credential_number', 100)->nullable()->after('expires_at');
            }
            if (! Schema::hasColumn('seeker_certificates', 'description')) {
                $table->text('description')->nullable()->after('credential_number');
            }
            if (! Schema::hasColumn('seeker_certificates', 'training_id')) {
                $table->foreignId('training_id')->nullable()->after('program_application_id')
                    ->constrained('seeker_trainings')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('seeker_certificates', function (Blueprint $table) {
            if (Schema::hasColumn('seeker_certificates', 'training_id')) {
                $table->dropConstrainedForeignId('training_id');
            }
            $columns = ['category', 'expires_at', 'credential_number', 'description'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('seeker_certificates', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
