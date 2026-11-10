<?php

namespace Tests\Concerns;

use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Minimal employers / job seekers / applications / placement tables for the
 * feedback system tests. Expects the test class to set $this->employerId.
 */
trait CreatesFeedbackTables
{
    protected function employer(string $name, string $status = 'verified'): int
    {
        return DB::table('employers')->insertGetId([
            'company_name' => $name, 'email' => strtolower(preg_replace('/\W+/', '', $name)).'@example.test',
            'verification_status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    protected function seeker(string $email): JobSeeker
    {
        return JobSeeker::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Seeker', 'email' => $email, 'password' => 'password123',
        ]);
    }

    protected function application(JobSeeker $seeker, string $status, array $extra = []): int
    {
        $postId = DB::table('job_vacancies')->insertGetId([
            'employer_id' => $this->employerId, 'job_title' => 'Machine Operator', 'status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('applications')->insertGetId(array_merge([
            'post_id' => $postId, 'seeker_id' => $seeker->seeker_id, 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ], $extra));
    }

    protected function placement(JobSeeker $seeker, int $employerId, string $reportStatus): int
    {
        $upload = DB::table('placement_report_uploads')->insertGetId([
            'employer_id' => $employerId, 'status' => $reportStatus, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('placement_records')->insertGetId([
            'upload_id' => $upload, 'employer_id' => $employerId, 'seeker_id' => $seeker->seeker_id,
            'position' => 'Baker', 'date_hired' => now()->subMonth()->toDateString(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    protected function createHiringTables(): void
    {
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        foreach (['job_seekers', 'employers'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name');
            $table->string('email')->unique();
            $table->string('verification_status')->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamps();
        });

        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('job_title');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('seeker_id');
            $table->string('status');
            $table->date('placement_start_date')->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('placement_report_uploads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employer_id');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('placement_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->unsignedBigInteger('employer_id');
            $table->unsignedBigInteger('seeker_id')->nullable();
            $table->string('position')->nullable();
            $table->date('date_hired')->nullable();
            $table->timestamps();
        });
    }
}
