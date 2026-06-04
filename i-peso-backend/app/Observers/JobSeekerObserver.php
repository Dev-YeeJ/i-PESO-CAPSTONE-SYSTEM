<?php

namespace App\Observers;

use App\Models\JobSeeker;
use Illuminate\Support\Facades\DB;

class JobSeekerObserver
{
    /**
     * Handle the JobSeeker "creating" event.
     * Assign the smallest available positive integer as `seeker_id`.
     */
    public function creating(JobSeeker $seeker): void
    {
        // If an explicit seeker_id was provided, respect it.
        if ($seeker->getKey()) {
            return;
        }

        DB::transaction(function () use ($seeker) {
            // Lock the rows to prevent concurrent races
            $ids = DB::table('job_seekers')
                ->orderBy('seeker_id')
                ->lockForUpdate()
                ->pluck('seeker_id')
                ->map(fn($v) => (int) $v)
                ->toArray();

            $next = 1;
            foreach ($ids as $id) {
                if ($id === $next) {
                    $next++;
                    continue;
                }
                if ($id > $next) break;
            }

            $seeker->seeker_id = $next;
        });
    }
}
