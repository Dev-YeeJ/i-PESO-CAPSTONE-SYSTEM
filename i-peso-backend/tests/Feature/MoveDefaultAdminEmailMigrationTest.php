<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MoveDefaultAdminEmailMigrationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // The suite runs on an empty SQLite database; create just what the migration reads.
        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('mobile_number');
                $table->string('password');
                $table->string('role')->default('admin');
                $table->string('status')->default('active');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        foreach (['job_seekers', 'employers'] as $name) {
            if (! Schema::hasTable($name)) {
                Schema::create($name, function (Blueprint $table) {
                    $table->id();
                    $table->string('email')->unique();
                    $table->timestamps();
                });
            }
        }
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_11_09_000001_move_default_admin_to_peso_gmail.php');
    }

    private function seedAdmin(string $email): int
    {
        return DB::table('administrators')->insertGetId([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => $email,
            'mobile_number' => '09123456789',
            'password' => Hash::make('secret-pass'),
            'role' => 'administrator',
            'status' => 'active',
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_moves_the_default_admin_and_keeps_the_password(): void
    {
        DB::table('administrators')->where('email', 'pesourdaneta@gmail.com')->delete();
        DB::table('administrators')->where('email', 'admin@peso.com')->delete();
        $id = $this->seedAdmin('admin@peso.com');

        $this->migration()->up();

        $admin = DB::table('administrators')->where('admin_id', $id)->first();
        $this->assertSame('pesourdaneta@gmail.com', $admin->email);
        $this->assertTrue(Hash::check('secret-pass', $admin->password));
    }

    public function test_does_nothing_when_there_is_no_default_admin(): void
    {
        DB::table('administrators')->whereIn('email', ['admin@peso.com', 'pesourdaneta@gmail.com'])->delete();
        $id = $this->seedAdmin('someone@peso.test');

        $this->migration()->up();

        $this->assertSame('someone@peso.test', DB::table('administrators')->where('admin_id', $id)->value('email'));
    }

    public function test_leaves_everything_alone_when_a_seeker_already_owns_the_gmail(): void
    {
        DB::table('administrators')->where('email', 'pesourdaneta@gmail.com')->delete();
        DB::table('administrators')->where('email', 'admin@peso.com')->delete();
        $id = $this->seedAdmin('admin@peso.com');
        DB::table('job_seekers')->where('email', 'pesourdaneta@gmail.com')->delete();
        DB::table('job_seekers')->insert(['email' => 'pesourdaneta@gmail.com', 'created_at' => now(), 'updated_at' => now()]);

        $this->migration()->up();

        $this->assertSame('admin@peso.com', DB::table('administrators')->where('admin_id', $id)->value('email'));
    }
}
