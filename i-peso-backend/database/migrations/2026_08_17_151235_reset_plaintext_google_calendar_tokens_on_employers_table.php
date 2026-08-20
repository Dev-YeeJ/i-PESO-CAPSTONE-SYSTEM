<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * google_access_token / google_refresh_token switch to an `encrypted`
     * Eloquent cast in this same change. Any value stored before that cast
     * existed is plaintext and cannot be decrypted, so it must be cleared —
     * affected employers simply reconnect Google Calendar.
     */
    public function up(): void
    {
        DB::table('employers')->update([
            'google_access_token' => null,
            'google_refresh_token' => null,
            'google_token_expires_at' => null,
        ]);
    }

    public function down(): void
    {
        // Irreversible: plaintext tokens were discarded, not preserved.
    }
};
