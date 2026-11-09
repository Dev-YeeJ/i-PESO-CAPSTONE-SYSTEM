<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Moves the default administrator from the placeholder admin@peso.com to
 * PESO Urdaneta's real Gmail, so password resets reach an inbox the office
 * owns. The password, role and everything else stay the same.
 *
 * Runs once on deploy. It changes nothing (and logs why) when:
 *  - an administrator already uses the new address,
 *  - the address belongs to a seeker or employer: sign-in checks those
 *    tables first, so the admin could never sign in with it,
 *  - there is no admin@peso.com account to move.
 */
return new class extends Migration
{
    private const OLD_EMAIL = 'admin@peso.com';

    private const NEW_EMAIL = 'pesourdaneta@gmail.com';

    public function up(): void
    {
        if (DB::table('administrators')->where('email', self::NEW_EMAIL)->exists()) {
            Log::info('Admin email move skipped: an administrator already uses '.self::NEW_EMAIL.'.');

            return;
        }

        foreach (['job_seekers', 'employers'] as $table) {
            if (DB::table($table)->where('email', self::NEW_EMAIL)->exists()) {
                Log::warning('Admin email move skipped: '.self::NEW_EMAIL." is already registered in {$table}.");

                return;
            }
        }

        $updated = DB::table('administrators')
            ->where('email', self::OLD_EMAIL)
            ->update(['email' => self::NEW_EMAIL, 'updated_at' => now()]);

        Log::info($updated
            ? 'Moved the default administrator from '.self::OLD_EMAIL.' to '.self::NEW_EMAIL.'.'
            : 'Admin email move skipped: no '.self::OLD_EMAIL.' account exists.');
    }

    public function down(): void
    {
        if (DB::table('administrators')->where('email', self::OLD_EMAIL)->exists()) {
            return;
        }

        DB::table('administrators')
            ->where('email', self::NEW_EMAIL)
            ->update(['email' => self::OLD_EMAIL, 'updated_at' => now()]);
    }
};
