<?php

namespace Tests\Feature;

use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportEscoOccupationsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('external_uri')->nullable()->unique();
                $table->string('classification_code', 50)->nullable();
                $table->string('isco_group', 10)->nullable();
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

    public function test_command_imports_esco_occupations_and_aliases_repeatably(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'esco-');
        file_put_contents($path, implode("\n", [
            'conceptType,conceptUri,iscoGroup,preferredLabel,altLabels,hiddenLabels,status,modifiedDate,regulatedProfessionNote,scopeNote,definition,inScheme,description,code,naceCode',
            'Occupation,http://data.europa.eu/esco/occupation/test-software,2512,software developer,"programmer'."\n".'web developer",coder,released,2025-12-10,,,,scheme,Develops software,2512.1,',
        ]));

        try {
            $this->artisan('occupations:import-esco', [
                'path' => $path,
                '--esco-version' => '1.2.1',
                '--deactivate-missing' => true,
            ])->assertSuccessful();

            $this->artisan('occupations:import-esco', [
                'path' => $path,
                '--esco-version' => '1.2.1',
            ])->assertSuccessful();

            $this->assertDatabaseCount('occupations', 1);
            $occupation = Occupation::firstOrFail();

            $this->assertSame('Software developer', $occupation->title);
            $this->assertSame('2512.1', $occupation->classification_code);
            $this->assertSame('2512', $occupation->isco_group);
            $this->assertStringContainsString('web developer', $occupation->search_terms);
            $this->assertSame('esco', $occupation->source);

            $this->getJson('/api/occupations?search=web%20developer')
                ->assertOk()
                ->assertJsonPath('data.0.id', $occupation->id)
                ->assertJsonPath('data.0.title', 'Software developer')
                ->assertJsonPath('data.0.code', '2512.1')
                ->assertJsonPath('data.0.isco_group', '2512')
                ->assertJsonPath('data.0.source', 'esco');
        } finally {
            @unlink($path);
        }
    }

    public function test_command_uses_the_versioned_repository_csv_by_default(): void
    {
        $path = database_path('data/esco/v1.2.1/occupations_en.csv');

        $this->assertTrue(is_file($path));
        $this->assertSame('occupations_en.csv', basename($path));
        $this->assertStringContainsString('conceptUri', (string) file_get_contents($path, false, null, 0, 200));
    }
}
