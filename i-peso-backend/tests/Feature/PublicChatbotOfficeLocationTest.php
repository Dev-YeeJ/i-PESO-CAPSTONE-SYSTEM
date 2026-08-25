<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PublicChatbotOfficeLocationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.gemini.key' => 'test-gemini-key',
            'services.gemini.base_url' => 'https://generativelanguage.googleapis.com/v1beta',
            'services.gemini.model' => 'gemini-test',
            'services.gemini.timeout' => 20,
        ]);
    }

    public function test_reply_mentioning_the_office_address_includes_office_location(): void
    {
        config(['peso_knowledge.office.address' => 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan']);

        Http::fake([
            '*generateContent*' => Http::response($this->geminiTextResponse(
                'Ang PESO office ay nasa XHG8+FV3, Alexander St, Urdaneta City, Pangasinan.'
            )),
        ]);

        $this->postJson('/api/chat/public', ['message' => 'Saan po ang PESO office?'])
            ->assertOk()
            ->assertJsonPath('office_location.address', 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan');
    }

    public function test_reply_not_mentioning_the_office_address_has_no_office_location(): void
    {
        config(['peso_knowledge.office.address' => 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan']);

        Http::fake([
            '*generateContent*' => Http::response($this->geminiTextResponse(
                'Libre po ang lahat ng serbisyo ng PESO.'
            )),
        ]);

        $this->postJson('/api/chat/public', ['message' => 'Libre ba ang PESO?'])
            ->assertOk()
            ->assertJsonPath('office_location', null);
    }

    public function test_address_mentioned_without_a_where_question_has_no_office_location(): void
    {
        config(['peso_knowledge.office.address' => 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan']);

        // The office address can ride along in an answer to something else
        // entirely (e.g. a citizen-charter service description). Only an
        // actual "where" question should trigger the map.
        Http::fake([
            '*generateContent*' => Http::response($this->geminiTextResponse(
                'Libre po ang lahat ng serbisyo ng PESO office sa XHG8+FV3, Alexander St, Urdaneta City, Pangasinan.'
            )),
        ]);

        $this->postJson('/api/chat/public', ['message' => 'Libre ba ang PESO?'])
            ->assertOk()
            ->assertJsonPath('office_location', null);
    }

    public function test_no_office_location_when_address_is_not_on_record(): void
    {
        config(['peso_knowledge.office.address' => null]);

        Http::fake([
            '*generateContent*' => Http::response($this->geminiTextResponse(
                'Wala pa pong nakalagay na address para sa PESO office.'
            )),
        ]);

        $this->postJson('/api/chat/public', ['message' => 'Saan po ang PESO office?'])
            ->assertOk()
            ->assertJsonPath('office_location', null);
    }

    private function geminiTextResponse(string $text): array
    {
        return [
            'candidates' => [
                ['content' => ['parts' => [['text' => $text]]]],
            ],
        ];
    }
}
