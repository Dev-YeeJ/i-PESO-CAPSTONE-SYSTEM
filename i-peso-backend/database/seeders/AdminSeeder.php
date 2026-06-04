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
        // Check if admin already exists
        if (Administrator::where('email', 'admin@peso.com')->exists()) {
            return;
        }

        Administrator::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@peso.com',
            'password' => Hash::make('password123'),
            'role' => 'administrator',
            'status' => 'active',
            'mobile_number' => '09123456789',
            'email_verified_at' => Carbon::now(),
        ]);
    }
}