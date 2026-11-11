<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Report & Safety Management: one case file for both directions —
 * job seekers reporting employers and employers reporting job seekers —
 * plus PESO-filed cases (e.g. escalated from a review).
 *
 * Reporter and subject columns deliberately carry no foreign keys: a case is
 * an accountability record and must outlive the accounts it names. Deleting a
 * user leaves the case intact with a "deleted account" placeholder instead of
 * silently erasing the complaint (which employer_reports' cascade did).
 *
 * Existing employer_reports rows are copied in. The old table is left in
 * place, untouched, as a backup; nothing reads it any more.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('safety_reports')) {
            Schema::create('safety_reports', function (Blueprint $table) {
                $table->id();
                $table->string('case_number', 20)->nullable()->unique();

                // Who filed it: job_seeker | employer | peso_staff
                $table->string('reporter_type', 20);
                $table->unsignedBigInteger('reporter_seeker_id')->nullable();
                $table->unsignedBigInteger('reporter_employer_id')->nullable();
                $table->unsignedBigInteger('filed_by_admin_id')->nullable();

                // Who it is about: employer | job_seeker
                $table->string('subject_type', 20);
                $table->unsignedBigInteger('subject_employer_id')->nullable();
                $table->unsignedBigInteger('subject_seeker_id')->nullable();

                // Context the report came from, linked so PESO need not search for it.
                $table->unsignedBigInteger('post_id')->nullable();
                $table->unsignedBigInteger('application_id')->nullable();
                $table->unsignedBigInteger('review_id')->nullable();

                $table->string('category', 40);
                $table->text('description');
                $table->date('incident_date')->nullable();

                $table->string('status', 30)->default('submitted');
                $table->string('priority', 10)->default('normal');
                $table->unsignedBigInteger('assigned_admin_id')->nullable();

                // Closing record: required when resolved or dismissed.
                $table->string('dismissal_reason', 40)->nullable();
                $table->text('resolution_summary')->nullable();
                $table->unsignedBigInteger('closed_by_admin_id')->nullable();
                $table->timestamp('closed_at')->nullable();

                $table->unsignedBigInteger('legacy_employer_report_id')->nullable()->unique();
                $table->timestamps();

                $table->index(['status', 'created_at']);
                $table->index(['subject_type', 'subject_employer_id']);
                $table->index(['subject_type', 'subject_seeker_id']);
                $table->index(['reporter_type', 'reporter_seeker_id']);
                $table->index(['reporter_type', 'reporter_employer_id']);
                $table->index('priority');
            });
        }

        if (! Schema::hasTable('safety_report_events')) {
            Schema::create('safety_report_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('report_id')->constrained('safety_reports')->cascadeOnDelete();
                // admin | reporter | system
                $table->string('actor_type', 20);
                $table->unsignedBigInteger('actor_admin_id')->nullable();
                // submitted | reporter_update | status_changed | priority_changed |
                // assigned | note | action
                $table->string('kind', 30);
                $table->string('from_value', 60)->nullable();
                $table->string('to_value', 60)->nullable();
                $table->text('body')->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();

                $table->index(['report_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('safety_report_attachments')) {
            Schema::create('safety_report_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('report_id')->constrained('safety_reports')->cascadeOnDelete();
                $table->string('original_filename');
                $table->string('stored_path');
                $table->string('mime_type', 100)->nullable();
                $table->unsignedInteger('file_size')->nullable();
                // reporter (with the report or a later update) or admin
                $table->string('uploaded_by', 20)->default('reporter');
                $table->timestamps();
            });
        }

        $this->copyLegacyEmployerReports();
    }

    public function down(): void
    {
        Schema::dropIfExists('safety_report_attachments');
        Schema::dropIfExists('safety_report_events');
        Schema::dropIfExists('safety_reports');
    }

    private function copyLegacyEmployerReports(): void
    {
        if (! Schema::hasTable('employer_reports')) {
            return;
        }

        $categories = [
            'fake_job' => 'fake_vacancy',
            'misleading' => 'misleading_terms',
            'abusive' => 'discrimination_harassment',
            'discrimination' => 'discrimination_harassment',
            'illegal_fees' => 'illegal_fees',
            'other' => 'other',
        ];
        $statuses = [
            'pending' => 'submitted',
            'investigating' => 'under_review',
            'resolved' => 'resolved',
            'dismissed' => 'dismissed',
        ];
        $highPriority = ['illegal_fees', 'discrimination_harassment'];

        DB::table('employer_reports')->orderBy('id')->chunkById(200, function ($rows) use ($categories, $statuses, $highPriority) {
            foreach ($rows as $row) {
                if (DB::table('safety_reports')->where('legacy_employer_report_id', $row->id)->exists()) {
                    continue;
                }

                $category = $categories[$row->reason] ?? 'other';
                $status = $statuses[$row->status] ?? 'submitted';
                $closed = in_array($status, ['resolved', 'dismissed'], true);

                $id = DB::table('safety_reports')->insertGetId([
                    'reporter_type' => 'job_seeker',
                    'reporter_seeker_id' => $row->seeker_id,
                    'subject_type' => 'employer',
                    'subject_employer_id' => $row->employer_id,
                    'category' => $category,
                    'description' => $row->description,
                    'status' => $status,
                    'priority' => in_array($category, $highPriority, true) ? 'high' : 'normal',
                    'dismissal_reason' => $status === 'dismissed' ? 'not_a_violation' : null,
                    'resolution_summary' => $closed ? ($row->admin_notes ?: 'Closed before case history was recorded.') : null,
                    'closed_by_admin_id' => $closed ? $row->resolved_by : null,
                    'closed_at' => $closed ? ($row->resolved_at ?? $row->updated_at) : null,
                    'legacy_employer_report_id' => $row->id,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);

                $year = $row->created_at ? substr((string) $row->created_at, 0, 4) : date('Y');
                DB::table('safety_reports')->where('id', $id)->update([
                    'case_number' => sprintf('RPT-%s-%05d', $year, $id),
                ]);

                $events = [[
                    'report_id' => $id, 'actor_type' => 'reporter', 'kind' => 'submitted',
                    'body' => null, 'created_at' => $row->created_at, 'updated_at' => $row->created_at,
                ]];
                if (filled($row->admin_notes)) {
                    $events[] = [
                        'report_id' => $id, 'actor_type' => 'admin', 'kind' => 'note',
                        'body' => $row->admin_notes, 'created_at' => $row->updated_at, 'updated_at' => $row->updated_at,
                    ];
                }
                DB::table('safety_report_events')->insert(array_map(fn ($event) => $event + [
                    'actor_admin_id' => null, 'from_value' => null, 'to_value' => null, 'meta' => null,
                ], $events));
            }
        });
    }
};
