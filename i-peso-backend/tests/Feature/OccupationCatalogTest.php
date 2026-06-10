<?php

namespace Tests\Feature;

use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OccupationCatalogTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('search_terms')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    public function test_catalog_search_returns_matching_active_occupations(): void
    {
        Occupation::create([
            'psoc_code' => '2512',
            'title' => 'Software Developer',
            'search_terms' => 'programmer web application',
        ]);
        Occupation::create([
            'psoc_code' => '2221',
            'title' => 'Registered Nurse',
        ]);

        $this->getJson('/api/occupations?search=programmer')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.psoc_code', '2512')
            ->assertJsonPath('data.0.title', 'Software Developer');
    }
}
