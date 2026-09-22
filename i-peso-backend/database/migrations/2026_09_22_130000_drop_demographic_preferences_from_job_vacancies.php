<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Drops the employer-settable demographic preferences from job postings.
 *
 * RA 10911 (Anti-Age Discrimination in Employment Act) sec. 5 makes it
 * unlawful to publish a job notice suggesting an age preference, and extends
 * that liability to job placement entities — which is what this PESO board is.
 * The Labor Code and RA 6725 cover sex. A posting states bona fide
 * qualifications (skills, licence, education); demographics are not among them.
 *
 * The columns drove nothing: matching ignored them, the seeker feed never
 * returned them, applications were never filtered on them, and they could not
 * be cited as a rejection reason. They were write-only data carrying legal risk.
 *
 * Values that expressed an actual preference are copied to an archive table
 * first, so PESO keeps the figure for anti-discrimination advocacy (the AIR-TIP
 * line on the SPRS form) without the live posting form soliciting it. Rows that
 * only ever held the 'Any' default are noise and are not archived.
 */
return new class extends Migration
{
    private const COLUMNS = ['preferred_gender', 'minimum_age', 'maximum_age'];

    public function up(): void
    {
        if (! Schema::hasTable('job_vacancies')) {
            return;
        }

        $present = array_values(array_filter(
            self::COLUMNS,
            fn ($column) => Schema::hasColumn('job_vacancies', $column)
        ));

        if ($present === []) {
            return;
        }

        if (! Schema::hasTable('job_vacancy_demographic_preference_archive')) {
            Schema::create('job_vacancy_demographic_preference_archive', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id')->index();
                $table->string('preferred_gender', 20)->nullable();
                $table->unsignedTinyInteger('minimum_age')->nullable();
                $table->unsignedTinyInteger('maximum_age')->nullable();
                $table->timestamp('archived_at')->useCurrent();
            });
        }

        $archived = array_fill_keys(self::COLUMNS, null);
        $rows = DB::table('job_vacancies')
            ->select(array_merge(['post_id'], $present))
            ->where(function ($query) use ($present) {
                foreach ($present as $column) {
                    // 'Any' is the form's default, not a stated preference.
                    $column === 'preferred_gender'
                        ? $query->orWhere(fn ($q) => $q->whereNotNull($column)->whereNotIn($column, ['Any', '']))
                        : $query->orWhereNotNull($column);
                }
            })
            ->get();

        foreach ($rows->chunk(500) as $chunk) {
            DB::table('job_vacancy_demographic_preference_archive')->insert(
                $chunk->map(fn ($row) => array_merge($archived, [
                    'post_id' => $row->post_id,
                    'preferred_gender' => $row->preferred_gender ?? null,
                    'minimum_age' => $row->minimum_age ?? null,
                    'maximum_age' => $row->maximum_age ?? null,
                    'archived_at' => now(),
                ]))->all()
            );
        }

        Schema::table('job_vacancies', function (Blueprint $table) use ($present) {
            $table->dropColumn($present);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('job_vacancies')) {
            return;
        }

        Schema::table('job_vacancies', function (Blueprint $table) {
            if (! Schema::hasColumn('job_vacancies', 'preferred_gender')) {
                $table->string('preferred_gender', 20)->nullable()->after('application_deadline');
            }
            if (! Schema::hasColumn('job_vacancies', 'minimum_age')) {
                $table->unsignedTinyInteger('minimum_age')->nullable()->after('preferred_gender');
            }
            if (! Schema::hasColumn('job_vacancies', 'maximum_age')) {
                $table->unsignedTinyInteger('maximum_age')->nullable()->after('minimum_age');
            }
        });

        if (Schema::hasTable('job_vacancy_demographic_preference_archive')) {
            DB::table('job_vacancy_demographic_preference_archive')
                ->orderBy('id')
                ->chunk(500, function ($rows) {
                    foreach ($rows as $row) {
                        DB::table('job_vacancies')
                            ->where('post_id', $row->post_id)
                            ->update([
                                'preferred_gender' => $row->preferred_gender,
                                'minimum_age' => $row->minimum_age,
                                'maximum_age' => $row->maximum_age,
                            ]);
                    }
                });

            Schema::drop('job_vacancy_demographic_preference_archive');
        }
    }
};
