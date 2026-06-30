<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('government_programs', 'category')) {
            Schema::table('government_programs', function (Blueprint $table) {
            $table->string('category', 60)->default('other')->after('program_name');
            $table->string('slug')->nullable()->unique()->after('category');
            $table->text('short_description')->nullable()->after('slug');
            $table->json('eligibility_requirements')->nullable()->after('target_beneficiaries');
            $table->json('required_documents')->nullable()->after('eligibility_requirements');
            $table->string('target_industry')->nullable()->after('required_documents');
            $table->foreignId('target_occupation_id')->nullable()->after('target_industry')
                ->constrained('occupations')->nullOnDelete();
            $table->string('venue')->nullable()->after('schedule');
            $table->text('location_address')->nullable()->after('venue');
            $table->decimal('latitude', 10, 7)->nullable()->after('location_address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->date('start_date')->nullable()->after('longitude');
            $table->date('end_date')->nullable()->after('start_date');
            $table->date('application_deadline')->nullable()->after('end_date');
            $table->unsignedInteger('total_slots')->default(0)->after('slot_limit');
            $table->unsignedInteger('available_slots')->default(0)->after('total_slots');
            $table->string('program_status', 30)->default('open')->after('status');
            $table->string('visibility', 20)->default('public')->after('program_status');
            $table->string('contact_person')->nullable()->after('visibility');
            $table->string('contact_email')->nullable()->after('contact_person');
            $table->string('contact_phone', 30)->nullable()->after('contact_email');
            $table->string('attachment_path')->nullable()->after('contact_phone');
            $table->timestamp('published_at')->nullable()->after('attachment_path');
            $table->timestamp('archived_at')->nullable()->after('published_at');
            $table->softDeletes();

            $table->index(['program_status', 'visibility']);
            $table->index(['category', 'application_deadline']);
            });
        }

        if (! Schema::hasColumn('program_applications', 'application_status')) {
            Schema::table('program_applications', function (Blueprint $table) {
            $table->string('application_status', 40)->default('pending')->after('status');
            $table->json('eligibility_snapshot')->nullable()->after('submitted_files');
            $table->unsignedTinyInteger('eligibility_score')->nullable()->after('eligibility_snapshot');
            $table->foreignId('reviewed_by_admin_id')->nullable()->after('admin_remarks')
                ->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_admin_id');
            $table->timestamp('completed_at')->nullable()->after('reviewed_at');
            $table->timestamp('cancelled_at')->nullable()->after('completed_at');

            $table->index(['program_id', 'application_status']);
            $table->index(['seeker_id', 'application_status']);
            });
        }

        if (! Schema::hasTable('government_program_skills')) {
            Schema::create('government_program_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('government_program_id')
                ->constrained('government_programs', 'program_id')->cascadeOnDelete();
            $table->foreignId('skill_id')->nullable()
                ->constrained('skill_catalog_entries')->nullOnDelete();
            $table->string('skill_name');
            $table->string('type', 20)->default('taught');
            $table->timestamps();

            $table->index(['government_program_id', 'type']);
            $table->index('skill_name');
            });
        }

        if (! Schema::hasTable('government_program_application_documents')) {
            Schema::create('government_program_application_documents', function (Blueprint $table) {
            $table->id('document_id');
            $table->foreignId('application_id')
                ->constrained('program_applications', 'prog_apply_id')->cascadeOnDelete();
            $table->string('document_type', 30)->default('requirement');
            $table->string('document_name');
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();

                $table->index(['application_id', 'document_type'], 'gp_app_docs_application_type_idx');
            });
        } elseif (! Schema::hasIndex('government_program_application_documents', 'gp_app_docs_application_type_idx')) {
            Schema::table('government_program_application_documents', function (Blueprint $table) {
                $table->index(['application_id', 'document_type'], 'gp_app_docs_application_type_idx');
            });
        }

        if (! Schema::hasTable('employer_skill_demands')) {
            Schema::create('employer_skill_demands', function (Blueprint $table) {
            $table->id('demand_id');
            $table->foreignId('employer_id')
                ->constrained('employers', 'employer_id')->cascadeOnDelete();
            $table->foreignId('job_vacancy_id')->nullable()
                ->constrained('job_vacancies', 'post_id')->nullOnDelete();
            $table->foreignId('skill_id')->nullable()
                ->constrained('skill_catalog_entries')->nullOnDelete();
            $table->string('skill_name');
            $table->foreignId('occupation_id')->nullable()
                ->constrained('occupations')->nullOnDelete();
            $table->foreignId('linked_program_id')->nullable()
                ->constrained('government_programs', 'program_id')->nullOnDelete();
            $table->unsignedInteger('workers_needed')->default(1);
            $table->text('reason');
            $table->string('preferred_training_timeline')->nullable();
            $table->string('status', 30)->default('submitted');
            $table->text('remarks')->nullable();
            $table->text('admin_remarks')->nullable();
            $table->foreignId('reviewed_by_admin_id')->nullable()
                ->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'skill_name']);
            $table->index(['employer_id', 'status']);
            });
        }

        if (! Schema::hasTable('citizen_charter_services')) {
            Schema::create('citizen_charter_services', function (Blueprint $table) {
            $table->id('service_id');
            $table->string('service_name');
            $table->text('description')->nullable();
            $table->json('requirements')->nullable();
            $table->string('processing_time')->nullable();
            $table->string('fees')->nullable();
            $table->string('responsible_office')->nullable();
            $table->json('steps')->nullable();
            $table->text('contact_info')->nullable();
            $table->string('status', 20)->default('published');
            $table->unsignedInteger('display_order')->default(0);
            $table->foreignId('created_by_admin_id')->nullable()
                ->constrained('administrators', 'admin_id')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'display_order']);
            });
        }

        if (! Schema::hasColumn('job_vacancies', 'hard_to_find_skills')) {
            Schema::table('job_vacancies', function (Blueprint $table) {
                $table->json('hard_to_find_skills')->nullable()->after('required_skills');
                $table->json('training_needed')->nullable()->after('hard_to_find_skills');
                $table->boolean('accepts_trainees')->default(false)->after('training_needed');
                $table->boolean('accepts_fresh_graduates')->default(false)->after('accepts_trainees');
            });
        }

        if (! Schema::hasColumn('seeker_certificates', 'program_application_id')) {
            Schema::table('seeker_certificates', function (Blueprint $table) {
                $table->foreignId('program_application_id')->nullable()->unique()
                    ->after('seeker_id')
                    ->constrained('program_applications', 'prog_apply_id')->nullOnDelete();
            });
        }

        $this->backfillLegacyPrograms();
    }

    public function down(): void
    {
        Schema::table('seeker_certificates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('program_application_id');
        });

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn([
                'hard_to_find_skills',
                'training_needed',
                'accepts_trainees',
                'accepts_fresh_graduates',
            ]);
        });

        Schema::dropIfExists('citizen_charter_services');
        Schema::dropIfExists('employer_skill_demands');
        Schema::dropIfExists('government_program_application_documents');
        Schema::dropIfExists('government_program_skills');

        Schema::table('program_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by_admin_id');
            $table->dropColumn([
                'application_status',
                'eligibility_snapshot',
                'eligibility_score',
                'reviewed_at',
                'completed_at',
                'cancelled_at',
            ]);
        });

        Schema::table('government_programs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_occupation_id');
            $table->dropSoftDeletes();
            $table->dropColumn([
                'category',
                'slug',
                'short_description',
                'eligibility_requirements',
                'required_documents',
                'target_industry',
                'venue',
                'location_address',
                'latitude',
                'longitude',
                'start_date',
                'end_date',
                'application_deadline',
                'total_slots',
                'available_slots',
                'program_status',
                'visibility',
                'contact_person',
                'contact_email',
                'contact_phone',
                'attachment_path',
                'published_at',
                'archived_at',
            ]);
        });
    }

    private function backfillLegacyPrograms(): void
    {
        DB::table('government_programs')->orderBy('program_id')->get()->each(function ($program) {
            $name = (string) $program->program_name;
            $legacyStatus = (string) $program->status;
            $category = match (true) {
                Str::contains(Str::lower($name), 'spes') => 'spes',
                Str::contains(Str::lower($name), 'tupad') => 'tupad',
                Str::contains(Str::lower($name), 'job fair') => 'job_fair',
                Str::contains(Str::lower($name), ['tesda', 'training', 'tech-voc', 'nc ii']) => 'tech_voc_training',
                Str::contains(Str::lower($name), 'livelihood') => 'livelihood_program',
                Str::contains(Str::lower($name), ['career', 'counsel']) => 'career_guidance',
                default => 'other',
            };
            $programStatus = match ($legacyStatus) {
                'ongoing' => 'open',
                'completed' => 'completed',
                'closed' => 'closed',
                default => 'open',
            };
            $usedSlots = DB::table('program_applications')
                ->where('program_id', $program->program_id)
                ->whereIn('status', ['approved', 'completed'])
                ->count();

            DB::table('government_programs')->where('program_id', $program->program_id)->update([
                'category' => $category,
                'slug' => Str::slug($name).'-'.$program->program_id,
                'short_description' => Str::limit(strip_tags((string) $program->description), 240),
                'start_date' => $program->schedule ? substr((string) $program->schedule, 0, 10) : null,
                'total_slots' => $program->slot_limit,
                'available_slots' => max(0, (int) $program->slot_limit - $usedSlots),
                'program_status' => $programStatus,
                'published_at' => $programStatus === 'open' ? now() : null,
            ]);
        });

        DB::table('program_applications')->update([
            'application_status' => DB::raw('status'),
        ]);
    }
};
