<?php

namespace App\Console\Commands;

use App\Models\Administrator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetAdminPassword extends Command
{
    protected $signature = 'admin:reset-password {email=admin@peso.com} {password=password123}';
    protected $description = 'Reset admin password for debugging/testing';

    public function handle()
    {
        $email = $this->argument('email');
        $password = $this->argument('password');

        $admin = Administrator::where('email', $email)->first();

        if (!$admin) {
            $this->error("Admin user with email {$email} not found.");
            return;
        }

        $admin->update(['password' => Hash::make($password)]);

        $this->info("✅ Password reset successfully for {$email}");
        $this->info("   Email: {$email}");
        $this->info("   Password: {$password}");
    }
}
