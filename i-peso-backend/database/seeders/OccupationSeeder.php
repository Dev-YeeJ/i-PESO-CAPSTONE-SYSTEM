<?php

namespace Database\Seeders;

use App\Models\Occupation;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OccupationSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('job_preferences.occupations', []) as $index => $title) {
            Occupation::updateOrCreate(
                ['psoc_code' => sprintf('LOCAL-%03d', $index + 1)],
                [
                    'title' => $title,
                    'search_terms' => Str::lower($title),
                    'version' => 'fallback',
                    'source' => 'fallback',
                    'is_active' => true,
                ]
            );
        }

        DB::table('seeker_occupations')
            ->whereNull('occupation_id')
            ->orderBy('id')
            ->eachById(function ($preference) {
                $occupationId = Occupation::where('title', $preference->occupation_title)->value('id');
                if ($occupationId) {
                    DB::table('seeker_occupations')
                        ->where('id', $preference->id)
                        ->update(['occupation_id' => $occupationId]);
                }
            });

        DB::table('job_vacancies')
            ->whereNull('occupation_id')
            ->orderBy('post_id')
            ->eachById(function ($vacancy) {
                $occupationId = Occupation::where('title', $vacancy->job_title)->value('id');
                if ($occupationId) {
                    DB::table('job_vacancies')
                        ->where('post_id', $vacancy->post_id)
                        ->update(['occupation_id' => $occupationId]);
                }
            }, column: 'post_id');
    }
}
