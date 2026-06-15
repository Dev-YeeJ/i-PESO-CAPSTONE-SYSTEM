<?php

namespace Tests\Feature;

use App\Models\Occupation;
use App\Models\OccupationAlias;
use App\Models\OccupationSourceMapping;
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
                $table->string('external_uri')->nullable();
                $table->string('classification_code')->nullable();
                $table->string('isco_group')->nullable();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('search_terms')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_aliases')) {
            Schema::create('occupation_aliases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('alias');
                $table->string('normalized_alias');
                $table->string('language')->default('en');
                $table->string('source')->default('local');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_general_terms')) {
            Schema::create('occupation_general_terms', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('term');
                $table->string('normalized_term');
                $table->string('language')->default('en');
                $table->string('source')->default('local_peso');
                $table->unsignedSmallInteger('priority')->default(100);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupation_source_mappings')) {
            Schema::create('occupation_source_mappings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id');
                $table->string('source');
                $table->string('external_code');
                $table->string('external_uri')->nullable();
                $table->string('version')->nullable();
                $table->json('metadata')->nullable();
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

    public function test_catalog_search_matches_local_aliases(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => '9111',
            'title' => 'Domestic Cleaner',
        ]);
        OccupationAlias::create([
            'occupation_id' => $occupation->id,
            'alias' => 'Kasambahay',
            'normalized_alias' => 'kasambahay',
            'language' => 'fil',
            'source' => 'local_peso',
            'confidence' => 1,
        ]);

        $this->getJson('/api/occupations?search=kasambahay')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $occupation->id)
            ->assertJsonPath('data.0.matched_alias', 'Kasambahay')
            ->assertJsonPath('data.0.match_type', 'alias');
    }

    public function test_catalog_search_normalizes_punctuation_in_alias_queries(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'LOCAL-REMOTE-ACCOUNTANT',
            'title' => 'Accountant',
            'source' => 'esco',
            'is_active' => true,
        ]);
        $occupation->aliases()->create([
            'alias' => 'Accountant (Remote)',
            'normalized_alias' => 'accountant remote',
            'language' => 'en',
            'source' => 'jobdatalake',
            'confidence' => 0.94,
        ]);

        $this->getJson('/api/occupations?search=Accountant%20%28Remote%29')
            ->assertOk()
            ->assertJsonPath('data.0.id', $occupation->id)
            ->assertJsonPath('data.0.matched_alias', 'Accountant (Remote)')
            ->assertJsonPath('data.0.match_type', 'alias');
    }

    public function test_catalog_search_exposes_esco_and_onet_sources_for_specific_jobs(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'ESCO-SOFTWARE-DEVELOPER',
            'classification_code' => '2512.1',
            'isco_group' => '2512',
            'title' => 'Software developer',
            'source' => 'esco',
            'is_active' => true,
        ]);
        OccupationAlias::create([
            'occupation_id' => $occupation->id,
            'alias' => 'Full Stack Developer',
            'normalized_alias' => 'full stack developer',
            'language' => 'en',
            'source' => 'onet_reported',
            'confidence' => 0.98,
        ]);
        OccupationSourceMapping::create([
            'occupation_id' => $occupation->id,
            'source' => 'onet',
            'external_code' => '15-1252.00',
            'version' => '30.3',
        ]);

        $this->getJson('/api/occupations?search=Full%20Stack%20Developer')
            ->assertOk()
            ->assertJsonPath('data.0.id', $occupation->id)
            ->assertJsonPath('data.0.matched_alias', 'Full Stack Developer')
            ->assertJsonPath('data.0.matched_alias_source', 'onet_reported')
            ->assertJsonPath('data.0.sources.0', 'O*NET')
            ->assertJsonPath('data.0.sources.1', 'ESCO')
            ->assertJsonPath('data.0.source_codes.esco', '2512.1')
            ->assertJsonPath('data.0.source_codes.onet.0', '15-1252.00');

        $this->getJson('/api/occupations?search=15-1252.00')
            ->assertOk()
            ->assertJsonPath('data.0.id', $occupation->id);
    }

    public function test_exact_psoc_occupation_ranks_before_duplicate_international_title(): void
    {
        $psoc = Occupation::create([
            'psoc_code' => '2221',
            'title' => 'Registered Nurse',
            'source' => 'psa',
            'is_active' => true,
        ]);
        Occupation::create([
            'psoc_code' => 'ESCO-REGISTERED-NURSE',
            'classification_code' => '2221.1',
            'title' => 'Registered Nurse',
            'source' => 'esco',
            'is_active' => true,
        ]);

        $this->getJson('/api/occupations?search=Registered%20Nurse')
            ->assertOk()
            ->assertJsonPath('data.0.id', $psoc->id)
            ->assertJsonPath('data.0.sources.0', 'PSOC')
            ->assertJsonPath('data.0.source_codes.psoc', '2221');
    }

    public function test_generalized_search_returns_multiple_ranked_occupations(): void
    {
        $taxiDriver = Occupation::create([
            'psoc_code' => 'DRIVER-TAXI',
            'title' => 'Taxi driver',
            'is_active' => true,
        ]);
        $deliveryDriver = Occupation::create([
            'psoc_code' => 'DRIVER-DELIVERY',
            'title' => 'Delivery Driver',
            'is_active' => true,
        ]);

        $taxiDriver->generalTerms()->create([
            'term' => 'driver',
            'normalized_term' => 'driver',
            'language' => 'en',
            'source' => 'local_peso',
            'priority' => 10,
        ]);
        $deliveryDriver->generalTerms()->create([
            'term' => 'driver',
            'normalized_term' => 'driver',
            'language' => 'en',
            'source' => 'local_peso',
            'priority' => 20,
        ]);

        $this->getJson('/api/occupations?search=driver')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $taxiDriver->id)
            ->assertJsonPath('data.0.matched_general_term', 'driver')
            ->assertJsonPath('data.0.match_type', 'generalized')
            ->assertJsonPath('data.1.id', $deliveryDriver->id);
    }

    public function test_general_mode_returns_broad_selectable_job_families(): void
    {
        $this->getJson('/api/occupations?mode=general&search=nurse')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 'general:healthcare work')
            ->assertJsonPath('data.0.title', 'Healthcare')
            ->assertJsonPath('data.0.general_term', 'healthcare work')
            ->assertJsonPath('data.0.is_general', true);
    }

    public function test_general_mode_resolves_a_specific_catalog_title_to_its_broad_field(): void
    {
        Occupation::create([
            'psoc_code' => 'FINANCE-ACCOUNTANT',
            'title' => 'Accountant',
            'is_active' => true,
        ]);

        $this->getJson('/api/occupations?mode=general&search=Accountant')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'general:finance work')
            ->assertJsonPath('data.0.title', 'Accounting and Finance')
            ->assertJsonPath('data.0.matched_job_title', 'Accountant')
            ->assertJsonPath('data.0.match_type', 'specific_job');
    }

    public function test_general_mode_resolves_a_local_alias_to_its_broad_field(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'SECURITY-GUARD',
            'title' => 'Security Guard',
            'is_active' => true,
        ]);
        OccupationAlias::create([
            'occupation_id' => $occupation->id,
            'alias' => 'Sekyu',
            'normalized_alias' => 'sekyu',
            'language' => 'fil',
            'source' => 'local_peso',
            'confidence' => 1,
        ]);

        $this->getJson('/api/occupations?mode=general&search=sekyu')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'general:security work')
            ->assertJsonPath('data.0.title', 'Security and Protective Services')
            ->assertJsonPath('data.0.matched_job_title', 'Security Guard');
    }

    public function test_reviewed_general_term_file_has_broad_unique_coverage(): void
    {
        $file = new \SplFileObject(database_path('data/occupations/general_terms.csv'));
        $file->setFlags(
            \SplFileObject::READ_CSV
            | \SplFileObject::SKIP_EMPTY
            | \SplFileObject::DROP_NEW_LINE
        );
        $header = $file->fgetcsv();
        $mappings = [];

        while (! $file->eof()) {
            $values = $file->fgetcsv();
            if ($values === false || $values === [null]) {
                continue;
            }

            $row = array_combine(
                $header,
                array_slice(array_pad($values, count($header), null), 0, count($header))
            );
            $key = strtolower(trim($row['term']).'|'.trim($row['canonical_title']));
            $this->assertArrayNotHasKey($key, $mappings, "Duplicate generalized mapping: {$key}");
            $mappings[$key] = true;
        }

        $this->assertGreaterThanOrEqual(500, count($mappings));
    }
}
