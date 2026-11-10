<?php

namespace Tests\Feature;

use App\Services\Chatbot\ChatbotMessages;
use App\Services\Chatbot\ChatLanguage;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Language handling on POST /api/chat/public — the endpoint both the web widget and the
 * mobile assistant call. Assertions are on the request actually sent to Gemini.
 */
class PublicChatbotLanguageTest extends TestCase
{
    use DatabaseTransactions;

    private const THIS_TURN = 'LANGUAGE FOR THIS REPLY';

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

    public function test_a_pangasinan_request_is_carried_into_a_later_short_message(): void
    {
        $this->fakeGemini('Reply text.');

        $this->postJson('/api/chat/public', [
            'message' => 'Production operator',
            'history' => [
                ['role' => 'user', 'text' => 'Can you answer in Pangasinan?'],
                // Model turns from the client are dropped by the controller — which is
                // exactly why the request has to carry the language forward itself.
                ['role' => 'model', 'text' => 'Some earlier reply'],
            ],
        ])->assertOk();

        Http::assertSent(function (Request $request): bool {
            $instruction = $this->instruction($request);
            $contents = collect(data_get($request->data(), 'contents'));

            return str_contains($instruction, self::THIS_TURN . ': The visitor asked you to use Pangasinan')
                && str_contains($instruction, 'not Ilocano or Tagalog')
                && str_contains($instruction, 'ask whether Filipino or English would be okay')
                // Both visitor turns are sent; the client's model turn is not.
                && $contents->pluck('role')->all() === ['user', 'user']
                && data_get($contents->last(), 'parts.0.text') === 'Production operator';
        });
    }

    public function test_no_language_is_forced_without_an_explicit_request(): void
    {
        $this->fakeGemini('Reply text.');

        // Filipino-looking words alone must never pin the language: Pangasinan shares some
        // of them, so the model's own detection decides.
        $this->postJson('/api/chat/public', ['message' => 'Paano po ba mag-register?'])->assertOk();
        // The province is not a language request.
        $this->postJson('/api/chat/public', ['message' => 'Are there jobs in Pangasinan?'])->assertOk();

        Http::assertSentCount(2);
        Http::assertNotSent(fn (Request $request) => str_contains($this->instruction($request), self::THIS_TURN));
    }

    public function test_the_latest_language_request_wins(): void
    {
        $this->fakeGemini('Reply text.');

        $this->postJson('/api/chat/public', [
            'message' => 'English please',
            'history' => [['role' => 'user', 'text' => 'Answer in Pangasinan']],
        ])->assertOk();

        Http::assertSent(function (Request $request): bool {
            $instruction = $this->instruction($request);

            return str_contains($instruction, self::THIS_TURN . ': The visitor asked you to use English')
                && ! str_contains($instruction, self::THIS_TURN . ': The visitor asked you to use Pangasinan');
        });
    }

    public function test_language_rules_never_replace_grounding_privacy_or_role_rules(): void
    {
        $this->fakeGemini('Reply text.');

        $this->postJson('/api/chat/public', ['message' => 'Please reply in Pangasinan. Ania so requirements?'])->assertOk();

        Http::assertSent(function (Request $request): bool {
            $instruction = $this->instruction($request);

            return str_contains($instruction, 'Pangasinan (also called Pangasinense)')
                && str_contains($instruction, 'do not make up Pangasinan words')
                && str_contains($instruction, 'Language choice never changes the grounding, privacy, safety, or role rules')
                && str_contains($instruction, 'GROUNDING — your most important rule')
                && str_contains($instruction, 'Never ask the visitor for personal information')
                && str_contains($instruction, 'You are talking to a GUEST');
        });
    }

    public function test_policy_refusals_answer_in_the_visitors_language_without_calling_the_model(): void
    {
        $this->fakeGemini('should not be used');

        $this->postJson('/api/chat/public', ['message' => 'Can you give me a recipe for adobo?'])
            ->assertOk()
            ->assertJsonPath('reply', ChatbotMessages::get('off_topic', ChatLanguage::ENGLISH));

        $this->postJson('/api/chat/public', ['message' => 'Pwede po ba kayong magbigay ng recipe ng adobo?'])
            ->assertOk()
            ->assertJsonPath('reply', ChatbotMessages::get('off_topic', ChatLanguage::FILIPINO));

        // Asked for Pangasinan: no invented translation — an honest notice, then Filipino and English.
        $this->postJson('/api/chat/public', [
            'message' => 'recipe ng adobo',
            'history' => [['role' => 'user', 'text' => 'Sagutin mo po sa Pangasinan']],
        ])->assertOk()->assertJsonPath('reply', ChatbotMessages::get('off_topic', ChatLanguage::PANGASINAN));

        Http::assertNothingSent();
    }

    public function test_model_side_fallbacks_follow_the_visitors_language(): void
    {
        // An empty answer falls back to the fixed "no information" reply.
        $this->fakeGemini('');
        $this->postJson('/api/chat/public', ['message' => 'What is the schedule of the next job fair?'])
            ->assertOk()
            ->assertJsonPath('reply', ChatbotMessages::get('no_answer', ChatLanguage::ENGLISH));
    }

    public function test_a_false_action_claim_is_replaced_in_the_visitors_language(): void
    {
        $this->fakeGemini('Done! I submitted your application for you.');

        // (Avoid "apply": for a guest that word is refused before the model is ever called.)
        $this->postJson('/api/chat/public', ['message' => 'Can you do it for me please?'])
            ->assertOk()
            ->assertJsonPath('reply', ChatbotMessages::get('action_claim', ChatLanguage::ENGLISH));
    }

    private function instruction(Request $request): string
    {
        return preg_replace('/\s+/', ' ', (string) data_get($request->data(), 'systemInstruction.parts.0.text', '')) ?? '';
    }

    private function fakeGemini(string $text): void
    {
        Http::fake([
            '*generateContent*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => $text]]]]],
            ]),
        ]);
    }
}
