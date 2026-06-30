<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_fairs', function (Blueprint $table) {
            if (! Schema::hasColumn('job_fairs', 'start_date')) {
                $table->date('start_date')->nullable()->after('description');
            }

            if (! Schema::hasColumn('job_fairs', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }

            if (! Schema::hasColumn('job_fairs', 'sector')) {
                $table->string('sector', 20)->default('local')->after('venue');
            }

            if (! Schema::hasColumn('job_fairs', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('status');
            }
        });

        Schema::create('job_fair_employers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_fair_id');
            $table->unsignedBigInteger('employer_id');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->foreign('job_fair_id')
                ->references('job_fair_id')
                ->on('job_fairs')
                ->cascadeOnDelete();

            $table->foreign('employer_id')
                ->references('employer_id')
                ->on('employers')
                ->cascadeOnDelete();

            $table->unique(['job_fair_id', 'employer_id']);
        });

        Schema::create('job_fair_vacancies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_fair_id');
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('vacancy_id');
            $table->timestamps();

            $table->foreign('job_fair_id')
                ->references('job_fair_id')
                ->on('job_fairs')
                ->cascadeOnDelete();

            $table->foreign('employer_id')
                ->references('employer_id')
                ->on('employers')
                ->cascadeOnDelete();

            $table->foreign('vacancy_id')
                ->references('post_id')
                ->on('job_vacancies')
                ->cascadeOnDelete();

            $table->unique(['job_fair_id', 'employer_id', 'vacancy_id']);
        });

        Schema::create('job_fair_attendees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_fair_id');
            $table->unsignedBigInteger('seeker_id');
            $table->uuid('qr_code_uuid')->unique();
            $table->timestamp('scanned_at')->nullable();
            $table->boolean('is_attended')->default(false);
            $table->timestamps();

            $table->foreign('job_fair_id')
                ->references('job_fair_id')
                ->on('job_fairs')
                ->cascadeOnDelete();

            $table->foreign('seeker_id')
                ->references('seeker_id')
                ->on('job_seekers')
                ->cascadeOnDelete();

            $table->unique(['job_fair_id', 'seeker_id']);
            $table->index(['job_fair_id', 'is_attended']);
        });

        Schema::table('applications', function (Blueprint $table) {
            if (! Schema::hasColumn('applications', 'job_fair_id')) {
                $table->unsignedBigInteger('job_fair_id')->nullable()->after('seeker_id');
                $table->foreign('job_fair_id')
                    ->references('job_fair_id')
                    ->on('job_fairs')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('applications', 'is_hots')) {
                $table->boolean('is_hots')->default(false)->after('job_fair_id');
            }

            if (! Schema::hasColumn('applications', 'dole_mismatch_code')) {
                $table->string('dole_mismatch_code', 100)->nullable()->after('is_hots');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            foreach (['dole_mismatch_code', 'is_hots'] as $column) {
                if (Schema::hasColumn('applications', $column)) {
                    $table->dropColumn($column);
                }
            }

            if (Schema::hasColumn('applications', 'job_fair_id')) {
                $table->dropConstrainedForeignId('job_fair_id');
            }
        });

        Schema::dropIfExists('job_fair_attendees');
        Schema::dropIfExists('job_fair_vacancies');
        Schema::dropIfExists('job_fair_employers');

        Schema::table('job_fairs', function (Blueprint $table) {
            foreach (['created_by', 'sector', 'end_date', 'start_date'] as $column) {
                if (Schema::hasColumn('job_fairs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
