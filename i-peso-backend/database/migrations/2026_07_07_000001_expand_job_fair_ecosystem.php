<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('job_fairs')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE job_fairs MODIFY status VARCHAR(40) NOT NULL DEFAULT 'draft'");
            }

            Schema::table('job_fairs', function (Blueprint $table) {
                if (! Schema::hasColumn('job_fairs', 'target_sector')) {
                    $table->string('target_sector', 255)->nullable()->after('sector');
                }
                if (! Schema::hasColumn('job_fairs', 'partner_agencies')) {
                    $table->json('partner_agencies')->nullable()->after('target_sector');
                }
                if (! Schema::hasColumn('job_fairs', 'submission_deadline')) {
                    $table->dateTime('submission_deadline')->nullable()->after('end_time');
                }
                if (! Schema::hasColumn('job_fairs', 'contact_email')) {
                    $table->string('contact_email')->nullable()->after('submission_deadline');
                }
                if (! Schema::hasColumn('job_fairs', 'maximum_representatives')) {
                    $table->unsignedTinyInteger('maximum_representatives')->default(2)->after('contact_email');
                }
                if (! Schema::hasColumn('job_fairs', 'is_public')) {
                    $table->boolean('is_public')->default(false)->after('status');
                }
                if (! Schema::hasColumn('job_fairs', 'published_at')) {
                    $table->timestamp('published_at')->nullable()->after('is_public');
                }
                if (! Schema::hasColumn('job_fairs', 'published_by')) {
                    $table->unsignedBigInteger('published_by')->nullable()->after('published_at');
                    $table->foreign('published_by')->references('admin_id')->on('administrators')->nullOnDelete();
                }
            });

            DB::table('job_fairs')->whereNotIn('sector', ['local', 'overseas', 'both'])->orderBy('job_fair_id')->each(function ($fair) {
                DB::table('job_fairs')->where('job_fair_id', $fair->job_fair_id)->update([
                    'target_sector' => $fair->target_sector ?: $fair->sector,
                    'sector' => 'local',
                ]);
            });
        }

        if (Schema::hasTable('job_fair_employers')) {
            Schema::table('job_fair_employers', function (Blueprint $table) {
                $columns = [
                    'participation_status' => fn () => $table->string('participation_status', 40)->default('interested')->after('employer_id'),
                    'source' => fn () => $table->string('source', 40)->default('employer_self_service')->after('participation_status'),
                    'confirmation_channel' => fn () => $table->string('confirmation_channel', 40)->nullable()->after('source'),
                    'invited_at' => fn () => $table->timestamp('invited_at')->nullable()->after('joined_at'),
                    'responded_at' => fn () => $table->timestamp('responded_at')->nullable()->after('invited_at'),
                    'reviewed_at' => fn () => $table->timestamp('reviewed_at')->nullable()->after('responded_at'),
                    'approved_at' => fn () => $table->timestamp('approved_at')->nullable()->after('reviewed_at'),
                    'attended_at' => fn () => $table->timestamp('attended_at')->nullable()->after('approved_at'),
                    'no_show_at' => fn () => $table->timestamp('no_show_at')->nullable()->after('attended_at'),
                    'encoded_results_at' => fn () => $table->timestamp('encoded_results_at')->nullable()->after('no_show_at'),
                    'report_generated_at' => fn () => $table->timestamp('report_generated_at')->nullable()->after('encoded_results_at'),
                    'remarks' => fn () => $table->text('remarks')->nullable()->after('report_generated_at'),
                    'reviewed_by' => fn () => $table->unsignedBigInteger('reviewed_by')->nullable()->after('remarks'),
                ];

                foreach ($columns as $name => $definition) {
                    if (! Schema::hasColumn('job_fair_employers', $name)) {
                        $definition();
                    }
                }
            });
        }

        if (! Schema::hasTable('job_fair_requirements')) {
            Schema::create('job_fair_requirements', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('job_fair_id');
                $table->string('code', 80);
                $table->string('label');
                $table->boolean('is_required')->default(true);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
                $table->foreign('job_fair_id')->references('job_fair_id')->on('job_fairs')->cascadeOnDelete();
                $table->unique(['job_fair_id', 'code']);
            });
        }

        if (Schema::hasTable('job_fairs') && Schema::hasTable('job_fair_requirements')) {
            $requirements = [
                'business_permit' => 'Business Permit', 'business_registration' => 'DTI / BIR / SEC Registration',
                'philjobnet_registration' => 'PhilJobNet Registration', 'job_vacancy_count' => 'Job Vacancy Count',
                'posterized_vacancy' => 'Posterized Job Vacancy with Contact Details',
                'no_pending_case' => 'Certificate of No Pending Case from DOLE', 'confirmation_slip' => 'Confirmation Slip',
            ];
            foreach (DB::table('job_fairs')->pluck('job_fair_id') as $fairId) {
                foreach ($requirements as $order => $label) {
                    $code = is_string($order) ? $order : str($label)->slug('_')->value();
                    DB::table('job_fair_requirements')->insertOrIgnore([
                        'job_fair_id' => $fairId, 'code' => $code, 'label' => $label, 'is_required' => true,
                        'sort_order' => array_search($code, array_keys($requirements), true), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }
        }

        if (! Schema::hasTable('job_fair_requirement_submissions')) {
            Schema::create('job_fair_requirement_submissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('job_fair_requirement_id');
                $table->unsignedBigInteger('job_fair_employer_id');
                $table->unsignedBigInteger('employer_id');
                $table->unsignedBigInteger('employer_document_id')->nullable();
                $table->string('document_path')->nullable();
                $table->string('original_filename')->nullable();
                $table->unsignedBigInteger('file_size')->nullable();
                $table->string('mime_type')->nullable();
                $table->string('status', 30)->default('submitted');
                $table->text('admin_remarks')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->timestamps();
                $table->foreign('job_fair_requirement_id')->references('id')->on('job_fair_requirements')->cascadeOnDelete();
                $table->foreign('job_fair_employer_id')->references('id')->on('job_fair_employers')->cascadeOnDelete();
                $table->foreign('employer_id')->references('employer_id')->on('employers')->cascadeOnDelete();
                $table->foreign('employer_document_id')->references('document_id')->on('employer_documents')->nullOnDelete();
                $table->foreign('reviewed_by')->references('admin_id')->on('administrators')->nullOnDelete();
                $table->unique(['job_fair_requirement_id', 'job_fair_employer_id'], 'job_fair_requirement_submission_unique');
            });
        }

        if (! Schema::hasTable('job_fair_confirmation_slips')) {
            Schema::create('job_fair_confirmation_slips', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('job_fair_id');
                $table->unsignedBigInteger('job_fair_employer_id')->nullable();
                $table->unsignedBigInteger('employer_id')->nullable();
                $table->string('company_name');
                $table->string('representative_1_name')->nullable();
                $table->string('representative_1_contact', 40)->nullable();
                $table->string('representative_2_name')->nullable();
                $table->string('representative_2_contact', 40)->nullable();
                $table->string('email')->nullable();
                $table->unsignedInteger('number_of_job_vacancies')->default(0);
                $table->boolean('will_conduct_onsite_interview')->default(false);
                $table->text('logistics_requests')->nullable();
                $table->string('source', 40);
                $table->string('dedupe_key', 191);
                $table->string('submitted_by')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamps();
                $table->foreign('job_fair_id')->references('job_fair_id')->on('job_fairs')->cascadeOnDelete();
                $table->foreign('job_fair_employer_id')->references('id')->on('job_fair_employers')->nullOnDelete();
                $table->foreign('employer_id')->references('employer_id')->on('employers')->nullOnDelete();
                $table->unique(['job_fair_id', 'dedupe_key'], 'job_fair_confirmation_dedupe');
            });
        }

        if (! Schema::hasTable('job_fair_result_reports')) {
            Schema::create('job_fair_result_reports', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('job_fair_id');
                $table->unsignedBigInteger('job_fair_employer_id')->nullable();
                $table->unsignedBigInteger('employer_id')->nullable();
                $table->string('company_name');
                $table->string('normalized_company_name', 191);
                $table->string('dedupe_key', 191);
                $table->string('employer_type', 40)->default('registered_employer');
                $table->string('source', 40);
                $table->string('contact_person')->nullable();
                $table->string('contact_number', 40)->nullable();
                $table->unsignedInteger('total_male')->default(0);
                $table->unsignedInteger('total_female')->default(0);
                $table->unsignedInteger('total_applicants')->default(0);
                $table->unsignedInteger('total_hots')->default(0);
                $table->unsignedInteger('total_near_hired')->default(0);
                $table->unsignedInteger('total_rejected')->default(0);
                $table->unsignedInteger('total_vacancies_solicited')->default(0);
                $table->unsignedInteger('total_vacancies_offered')->default(0);
                $table->text('remarks')->nullable();
                $table->unsignedBigInteger('encoded_by_admin_id')->nullable();
                $table->unsignedBigInteger('submitted_by_employer_id')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('report_generated_at')->nullable();
                $table->timestamps();
                $table->foreign('job_fair_id')->references('job_fair_id')->on('job_fairs')->cascadeOnDelete();
                $table->foreign('job_fair_employer_id')->references('id')->on('job_fair_employers')->nullOnDelete();
                $table->foreign('employer_id')->references('employer_id')->on('employers')->nullOnDelete();
                $table->foreign('encoded_by_admin_id')->references('admin_id')->on('administrators')->nullOnDelete();
                $table->foreign('submitted_by_employer_id')->references('employer_id')->on('employers')->nullOnDelete();
                $table->unique(['job_fair_id', 'dedupe_key'], 'job_fair_result_dedupe');
                $table->index(['job_fair_id', 'source']);
            });
        }

        if (! Schema::hasTable('job_fair_result_entries')) {
            Schema::create('job_fair_result_entries', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('result_report_id');
                $table->string('applicant_name');
                $table->string('gender', 20);
                $table->string('position_applied_for');
                $table->string('status', 30);
                $table->string('mismatch_code', 80)->nullable();
                $table->text('remarks')->nullable();
                $table->timestamps();
                $table->foreign('result_report_id')->references('id')->on('job_fair_result_reports')->cascadeOnDelete();
                $table->index(['result_report_id', 'status']);
            });
        }

        if (! Schema::hasTable('job_fair_result_mismatch_tallies')) {
            Schema::create('job_fair_result_mismatch_tallies', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('result_report_id');
                $table->string('mismatch_code', 80);
                $table->unsignedInteger('count')->default(0);
                $table->timestamps();
                $table->foreign('result_report_id')->references('id')->on('job_fair_result_reports')->cascadeOnDelete();
                $table->unique(['result_report_id', 'mismatch_code'], 'job_fair_result_mismatch_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('job_fair_result_mismatch_tallies');
        Schema::dropIfExists('job_fair_result_entries');
        Schema::dropIfExists('job_fair_result_reports');
        Schema::dropIfExists('job_fair_confirmation_slips');
        Schema::dropIfExists('job_fair_requirement_submissions');
        Schema::dropIfExists('job_fair_requirements');
    }
};
