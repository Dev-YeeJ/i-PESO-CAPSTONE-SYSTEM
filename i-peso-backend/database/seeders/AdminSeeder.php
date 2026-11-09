<?php

namespace Database\Seeders;

use App\Models\Administrator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run()
    {
        // Only bootstraps an empty install. Checking for any administrator (not
        // just admin@peso.com) matters: production's admin was moved to the
        // PESO Gmail, and re-seeding must not add a second admin with the
        // default password.
        if (Administrator::where('role', 'administrator')->exists()) {
            return;
        }

        Administrator::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@peso.com',
            // 'password123' only applies when SEED_ADMIN_PASSWORD is unset — fine for
            // local dev, never acceptable in production (it's sitting in git history).
            'password' => Hash::make(env('SEED_ADMIN_PASSWORD', 'password123')),
            'role' => 'administrator',
            'status' => 'active',
            'mobile_number' => '09123456789',
            'email_verified_at' => Carbon::now(),
        ]);
    }
}