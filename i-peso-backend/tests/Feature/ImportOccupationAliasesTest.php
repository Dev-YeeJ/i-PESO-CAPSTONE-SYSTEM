<?php

namespace Tests\Feature;

use App\Models\Occupation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportOccupationAliasesTest extends TestCase
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
    }

    public function test_strict_validation_fails_without_writing_invalid_aliases(): void
    {
        $path = $this->temporaryCsv([
            'canonical_title,alias,language,source,confidence',
            'Missing occupation,local title,fil,local_peso,1',
        ]);

        try {
            $this->artisan('occupations:import-aliases', [
                'path' => $path,
                '--validate-only' => true,
                '--strict' => true,
            ])->assertFailed();

            $this->assertDatabaseMissing('occupation_aliases', [
                'normalized_alias' => 'local title',
            ]);
        } finally {
            @unlink($path);
        }
    }

    public function test_import_normalizes_punctuation_in_reviewed_aliases(): void
    {
        $occupation = Occupation::create([
            'psoc_code' => 'LOCAL-TEST-ALIAS',
            'title' => 'Accountant',
            'is_active' => true,
        ]);
        $path = $this->temporaryCsv([
            'canonical_title,alias,language,source,confidence',
            'Accountant,Accountant (Remote),en,local_peso,0.95',
        ]);

        try {
            $this->artisan('occupations:import-aliases', [
                'path' => $path,
                '--strict' => true,
            ])->assertSuccessful();

            $this->assertDatabaseHas('occupation_aliases', [
                'occupation_id' => $occupation->id,
                'alias' => 'Accountant (Remote)',
                'normalized_alias' => 'accountant remote',
                'source' => 'local_peso',
            ]);
        } finally {
            @unlink($path);
        }
    }

    private function temporaryCsv(array $lines): string
    {
        $path = tempnam(sys_get_temp_dir(), 'occupation-aliases-');
        file_put_contents($path, implode(PHP_EOL, $lines));

        return $path;
    }
}
