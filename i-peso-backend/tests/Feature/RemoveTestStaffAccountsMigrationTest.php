<?php

namespace Tests\Feature;

use App\Models\Administrator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class RemoveTestStaffAccountsMigrationTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // SQLite only enforces foreign keys (and reports them) when they are switched on.
        DB::statement('PRAGMA foreign_keys = ON');
        $this->createStaffTables();
        DB::table('admin_roles')->insert(['name' => 'System Administrator', 'slug' => 'administrator', 'permissions' => '{}', 'is_system' => true]);

        // A table shaped like job_fairs: deleting its creator would cascade-delete it.
        Schema::create('job_fairs', function (Blueprint $table) {
            $table->id('job_fair_id');
            $table->string('title');
            $table->unsignedBigInteger('admin_id');
            $table->unsignedBigInteger('published_by')->nullable();
            $table->foreign('admin_id')->references('admin_id')->on('administrators')->cascadeOnDelete();
            $table->foreign('published_by')->references('admin_id')->on('administrators')->nullOnDelete();
        });
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_11_11_000001_remove_test_staff_accounts.php');
    }

    private function account(string $email, array $extra = []): int
    {
        return DB::table('administrators')->insertGetId(array_merge([
            'first_name' => 'Test', 'last_name' => 'Person', 'email' => $email, 'password' => 'x',
            'role' => 'administrative-aide', 'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ], $extra));
    }

    public function test_removes_every_other_account_and_hands_their_records_over(): void
    {
        $keep = $this->account('pesourdaneta@gmail.com', ['role' => 'administrator']);
        $fake = $this->account('fake.aide@peso.test');
        $intern = $this->account('fake.intern@school.test', ['position' => 'ojt_intern']);

        DB::table('job_fairs')->insert(['title' => 'Real Job Fair made by a test account', 'admin_id' => $fake, 'published_by' => $fake]);
        DB::table('ojt_time_logs')->insert(['admin_id' => $intern, 'work_date' => '2026-11-10', 'time_in' => now(), 'status' => 'open', 'reviewed_by' => $fake]);
        DB::table('personal_access_tokens')->insert(['tokenable_type' => Administrator::class, 'tokenable_id' => $fake, 'name' => 'web', 'token' => str_repeat('a', 64)]);

        $this->migration()->up();

        $this->assertSame(['pesourdaneta@gmail.com'], DB::table('administrators')->pluck('email')->all());

        $fair = DB::table('job_fairs')->first();
        $this->assertNotNull($fair, 'The job fair must survive its creator being removed.');
        $this->assertSame($keep, (int) $fair->admin_id);
        $this->assertSame($keep, (int) $fair->published_by);

        $this->assertSame(0, DB::table('ojt_time_logs')->count(), "A removed intern's own time record goes with them.");
        $this->assertSame(0, DB::table('personal_access_tokens')->count());

        $kept = DB::table('administrators')->first();
        $this->assertSame('administrator', $kept->role);
        $this->assertSame('peso_office_manager', $kept->position);
        $this->assertSame('active', $kept->status);
    }

    public function test_does_nothing_when_the_peso_gmail_is_not_an_admin(): void
    {
        $this->account('admin@peso.com', ['role' => 'administrator']);
        $this->account('fake.aide@peso.test');

        $this->migration()->up();

        $this->assertSame(2, DB::table('administrators')->count());
    }
}
