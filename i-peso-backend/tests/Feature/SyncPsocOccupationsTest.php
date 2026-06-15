<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SyncPsocOccupationsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.psoc.token' => 'test-token',
            'services.psoc.base_url' => 'https://classification.psa.test/psoc',
        ]);

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

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('occupation_title');
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('job_title');
            });
        }
    }

    public function test_command_imports_documented_paginated_results(): void
    {
        Http::fake(function (Request $request) {
            if ((int) $request['page'] === 1) {
                return Http::response([
                    'count' => 2,
                    'next' => 'https://classification.psa.test/psoc/2012/unit?page=2',
                    'previous' => null,
                    'results' => [[
                        'id' => 1,
                        'majorcode' => 1,
                        'submajorcode' => 11,
                        'minorcode' => 111,
                        'unitcode' => 1111,
                        'title' => 'LEGISLATORS',
                        'description' => 'Legislators formulate laws.',
                        'version' => '2012',
                    ]],
                ]);
            }

            return Http::response([
                'count' => 2,
                'next' => null,
                'previous' => 'https://classification.psa.test/psoc/2012/unit?page=1',
                'results' => [[
                    'id' => 2,
                    'majorcode' => 0,
                    'submajorcode' => 1,
                    'minorcode' => 11,
                    'unitcode' => 110,
                    'title' => 'COMMISSIONED ARMED FORCES OFFICERS',
                    'description' => 'Commissioned officers provide leadership.',
                    'version' => '2012',
                ]],
            ]);
        });

        $this->artisan('occupations:sync-psoc', ['--page-size' => 1])
            ->expectsOutput('Synchronized 2 PSOC unit groups.')
            ->assertSuccessful();

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://classification.psa.test/psoc/2012/unit?token=test-token&page=1&page_size=1'
            && $request['token'] === 'test-token'
            && (int) $request['page_size'] === 1);

        $this->assertDatabaseHas('occupations', [
            'psoc_code' => '1111',
            'title' => 'Legislators',
            'description' => 'Legislators formulate laws.',
            'version' => '2012',
            'source' => 'psa',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('occupations', [
            'psoc_code' => '0110',
            'title' => 'Commissioned Armed Forces Officers',
            'source' => 'psa',
        ]);
    }

    public function test_command_reports_cloudflare_challenge_without_exposing_the_token(): void
    {
        Http::fake([
            '*' => Http::response(
                '<html>Cloudflare challenge</html>',
                403,
                ['Cf-Mitigated' => 'challenge']
            ),
        ]);

        $this->artisan('occupations:sync-psoc')
            ->expectsOutput('The PSA PSOC API returned a Cloudflare browser challenge (HTTP 403).')
            ->doesntExpectOutputToContain('test-token')
            ->assertFailed();
    }

    public function test_command_reports_connection_failure_without_exposing_the_token(): void
    {
        Http::fake([
            '*' => Http::failedConnection('Connection failed for URL containing test-token'),
        ]);

        $this->artisan('occupations:sync-psoc')
            ->expectsOutput('Unable to connect to the PSA PSOC API on page 1.')
            ->doesntExpectOutputToContain('test-token')
            ->assertFailed();
    }
}
