<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\JobSeeker;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use CreatesStaffTables;
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStaffTables();
        $this->createSearchTables();
    }

    public function test_admin_search_finds_seekers_employers_and_postings_by_every_word(): void
    {
        $this->seekerRow('Ana', 'Santos', 'ana@example.test');
        $this->seekerRow('Ana', 'Reyes', 'reyes@example.test');
        $employer = $this->employerRow('Santos Bakery', 'verified');
        $this->vacancy($employer, 'Santos Bakery Helper');

        Sanctum::actingAs($this->admin());

        $groups = collect($this->getJson('/api/admin/search?q=ana+santos')->assertOk()->json('groups'))->keyBy('key');
        $this->assertSame(['Ana Santos'], collect($groups['seekers']['items'])->pluck('title')->all());

        $groups = collect($this->getJson('/api/admin/search?q=santos')->assertOk()->json('groups'))->keyBy('key');
        $this->assertSame(['seekers', 'employers', 'vacancies'], $groups->keys()->all());
        $this->assertSame('vacancy', $groups['vacancies']['items'][0]['type']);
    }

    public function test_admin_search_only_returns_groups_the_staff_member_may_open(): void
    {
        $this->seekerRow('Ana', 'Santos', 'ana@example.test');
        $employer = $this->employerRow('Santos Bakery', 'verified');
        $this->vacancy($employer, 'Santos Helper');

        Sanctum::actingAs($this->staffWith(['employment_hub' => 'view']));

        $keys = collect($this->getJson('/api/admin/search?q=santos')->assertOk()->json('groups'))->pluck('key')->all();
        $this->assertSame(['vacancies'], $keys);
    }

    public function test_employer_search_is_limited_to_their_own_vacancies_and_applicants(): void
    {
        $mine = $this->employerRow('Mine Corp', 'verified');
        $theirs = $this->employerRow('Other Corp', 'verified');
        $myJob = $this->vacancy($mine, 'Cashier');
        $theirJob = $this->vacancy($theirs, 'Cashier Lead');
        $ana = $this->seekerRow('Ana', 'Cruz', 'ana@example.test');
        $ben = $this->seekerRow('Ana', 'Bautista', 'ben@example.test');
        DB::table('applications')->insert([
            ['post_id' => $myJob, 'seeker_id' => $ana, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()],
            ['post_id' => $theirJob, 'seeker_id' => $ben, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()],
        ]);

        Sanctum::actingAs(Employer::findOrFail($mine));

        $groups = collect($this->getJson('/api/employer/search?q=cashier')->assertOk()->json('groups'))->keyBy('key');
        $this->assertSame(['Cashier'], collect($groups['vacancies']['items'])->pluck('title')->all());
        $this->assertSame('Active, 1 applicant', $groups['vacancies']['items'][0]['subtitle']);

        $groups = collect($this->getJson('/api/employer/search?q=ana')->assertOk()->json('groups'))->keyBy('key');
        $this->assertSame(['Ana Cruz'], collect($groups['applicants']['items'])->pluck('title')->all());
    }

    public function test_seeker_search_returns_only_open_listings_and_public_programs(): void
    {
        $verified = $this->employerRow('Verified Co', 'verified');
        $pending = $this->employerRow('Pending Co', 'pending');
        $this->vacancy($verified, 'Welder');
        $this->vacancy($verified, 'Welder Closed', ['status' => 'closed']);
        $this->vacancy($verified, 'Welder Expired', ['application_deadline' => now()->subDay()->toDateString()]);
        $this->vacancy($pending, 'Welder Unverified');
        DB::table('government_programs')->insert([
            ['program_name' => 'Welding NC II', 'program_status' => 'open', 'visibility' => 'public', 'category' => 'Training'],
            ['program_name' => 'Welding Draft', 'program_status' => 'draft', 'visibility' => 'public', 'category' => 'Training'],
        ]);

        Sanctum::actingAs(JobSeeker::findOrFail($this->seekerRow('Sam', 'Lee', 'sam@example.test')));

        $groups = collect($this->getJson('/api/seeker/search?q=weld')->assertOk()->json('groups'))->keyBy('key');
        $this->assertSame(['Welder'], collect($groups['jobs']['items'])->pluck('title')->all());
        $this->assertSame(['Welding NC II'], collect($groups['programs']['items'])->pluck('title')->all());
    }

    public function test_search_needs_at_least_two_characters_and_the_right_portal(): void
    {
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/admin/search?q=a')->assertStatus(422);
        $this->getJson('/api/employer/search?q=ana')->assertStatus(403);
    }

    // ── Fixtures ─────────────────────────────────────────────────────────

    private function admin(): Administrator
    {
        return Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'search-admin@example.test',
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function staffWith(array $permissions): Administrator
    {
        $role = AdminRole::create(['name' => 'Search role', 'slug' => 'search-role', 'permissions' => $permissions]);

        return Administrator::create([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => 'search-staff@example.test', 'password' => 'password123',
            'role' => 'staff', 'admin_role_id' => $role->id, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function seekerRow(string $first, string $last, string $email): int
    {
        return DB::table('job_seekers')->insertGetId([
            'first_name' => $first, 'last_name' => $last, 'email' => $email, 'password' => 'x',
            'created_at' => now(), 'updated_at' => now(),
        ], 'seeker_id');
    }

    private function employerRow(string $name, string $status): int
    {
        return DB::table('employers')->insertGetId([
            'company_name' => $name, 'email' => strtolower(preg_replace('/\W+/', '', $name)).'@example.test',
            'verification_status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ], 'employer_id');
    }

    private function vacancy(int $employerId, string $title, array $overrides = []): int
    {
        return DB::table('job_vacancies')->insertGetId(array_merge([
            'employer_id' => $employerId, 'job_title' => $title, 'status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ], $overrides), 'post_id');
    }

    private function createSearchTables(): void
    {
        foreach (['applications', 'job_vacancies', 'job_seekers', 'employers', 'government_programs'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('employers', function (Blueprint $table) {
            $table->id('employer_id');
            $table->string('company_name')->nullable();
            $table->string('trade_name')->nullable();
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('verification_status')->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('job_seekers', function (Blueprint $table) {
            $table->id('seeker_id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('address_municipality_city')->nullable();
            $table->timestamps();
        });

        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id('post_id');
            $table->unsignedBigInteger('employer_id');
            $table->string('job_title');
            $table->string('general_term')->nullable();
            $table->string('status')->default('active');
            $table->timestamp('admin_hold_at')->nullable();
            $table->date('application_deadline')->nullable();
            $table->string('barangay')->nullable();
            $table->string('city_municipality')->nullable();
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id('apply_id');
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('seeker_id');
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('government_programs', function (Blueprint $table) {
            $table->id('program_id');
            $table->string('program_name');
            $table->string('target_industry')->nullable();
            $table->string('category')->nullable();
            $table->string('program_status')->default('draft');
            $table->string('visibility')->default('public');
            $table->timestamps();
            $table->softDeletes();
        });
    }
}
