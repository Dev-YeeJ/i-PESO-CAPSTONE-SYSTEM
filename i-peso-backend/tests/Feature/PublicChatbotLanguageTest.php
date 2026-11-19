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

    public function test_each_message_is_checked_for_language_without_pinning_one(): void
    {
        $this->fakeGemini('Reply text.');

        // Pangasinan (not clearly English or Tagalog): steer away from a Tagalog fallback.
        $this->postJson('/api/chat/public', ['message' => 'Antoy job vacancies ya saragto ed siyak?'])->assertOk();
        // Filipino-looking: the latest-message rule only — no guess, since Pangasinan shares these words.
        $this->postJson('/api/chat/public', ['message' => 'Paano po ba mag-register?'])->assertOk();
        // Taglish: mirror the mix.
        $this->postJson('/api/chat/public', ['message' => 'Paano mag-register sa job fair? What are the requirements?'])->assertOk();

        $instructions = collect(Http::recorded())->map(fn (array $pair) => $this->instruction($pair[0]))->values();
        $this->assertCount(3, $instructions);

        // Every message is judged on its own; none of them pins a language.
        foreach ($instructions as $instruction) {
            $this->assertStringContainsString("LANGUAGE CHECK FOR THIS MESSAGE: Decide the reply language from the visitor's LATEST message only", $instruction);
            $this->assertStringNotContainsString(self::THIS_TURN, $instruction);
        }

        $this->assertStringContainsString('it may be Pangasinan or Ilocano', $instructions[0]);
        $this->assertStringContainsString('Do not fall back to Tagalog', $instructions[0]);
        $this->assertStringContainsString('Never say you can speak a language while replying in a different one', $instructions[0]);

        $this->assertStringNotContainsString('may be Pangasinan or Ilocano', $instructions[1]);
        $this->assertStringNotContainsString('Mirror the same natural mix', $instructions[1]);

        $this->assertStringContainsString('Mirror the same natural mix', $instructions[2]);
    }

    public function test_an_earlier_pangasinan_request_ends_when_the_visitor_switches_to_tagalog(): void
    {
        $this->fakeGemini('Reply text.');

        // The reported case: Pangasinan asked for earlier, then a short Tagalog question.
        $this->postJson('/api/chat/public', [
            'message' => 'May job vacancies ba?',
            'history' => [
                ['role' => 'user', 'text' => 'Marunong ka bang magsalita ng Pangasinan?'],
                ['role' => 'model', 'text' => 'Some earlier reply'],
                ['role' => 'user', 'text' => 'Antoy job fair natan?'],
            ],
        ])->assertOk();

        Http::assertSent(function (Request $request): bool {
            $instruction = $this->instruction($request);

            return ! str_contains($instruction, self::THIS_TURN)
                && str_contains($instruction, 'The visitor asked for Pangasinan earlier; if this message is in a different language, that earlier request no longer applies')
                // A Tagalog question is never steered towards Pangasinan.
                && ! str_contains($instruction, 'may be Pangasinan or Ilocano');
        });
    }

    public function test_borrowed_tagalog_words_in_a_pangasinan_message_keep_the_pangasinan_request(): void
    {
        $this->fakeGemini('Reply text.');

        // Pangasinan speakers borrow "pwede" and "po"; that is not a switch to Tagalog.
        foreach (['Pwede ak onla ed job fair?', 'Anto ray requirements ed TUPAD po?'] as $message) {
            $this->postJson('/api/chat/public', [
                'message' => $message,
                'history' => [['role' => 'user', 'text' => 'Sagutin mo sa Pangasinan']],
            ])->assertOk();
        }

        $instructions = collect(Http::recorded())->map(fn (array $pair) => $this->instruction($pair[0]))->values();
        $this->assertCount(2, $instructions);

        foreach ($instructions as $instruction) {
            $this->assertStringContainsString(self::THIS_TURN . ': The visitor asked you to use Pangasinan', $instruction);
            $this->assertStringNotContainsString('that earlier request no longer applies', $instruction);
        }
    }

    public function test_a_pangasinan_message_with_borrowed_words_still_gets_the_pangasinan_caution(): void
    {
        $this->fakeGemini('Reply text.');

        // No request at all: "wala" and "pwede" must not hide the "may be Pangasinan" hint.
        $this->postJson('/api/chat/public', ['message' => 'Wala ray bakante ed Urdaneta?'])->assertOk();
        $this->postJson('/api/chat/public', ['message' => 'Pwede ak onla ed job fair natan?'])->assertOk();

        $instructions = collect(Http::recorded())->map(fn (array $pair) => $this->instruction($pair[0]))->values();
        $this->assertCount(2, $instructions);

        foreach ($instructions as $instruction) {
            $this->assertStringContainsString('it may be Pangasinan or Ilocano', $instruction);
            $this->assertStringContainsString('Do not fall back to Tagalog', $instruction);
        }
    }

    public function test_a_language_request_still_carries_over_to_a_neutral_message(): void
    {
        $this->fakeGemini('Reply text.');

        // No Tagalog-only or English words: the visitor has not switched, so the request holds.
        $this->postJson('/api/chat/public', [
            'message' => 'Production operator Urdaneta',
            'history' => [['role' => 'user', 'text' => 'Sagutin mo sa Pangasinan']],
        ])->assertOk();

        Http::assertSent(fn (Request $request) => str_contains($this->instruction($request), self::THIS_TURN . ': The visitor asked you to use Pangasinan'));
    }

    public function test_bracketed_codes_written_by_the_model_never_reach_the_visitor(): void
    {
        $this->fakeGemini("Narito ang mga job fair.\n\n[[LIST_JOB_FAIRS]]\n[[SEARCH_JOB_VACANCIES]]");

        $reply = $this->postJson('/api/chat/public', ['message' => 'Kailan po ang job fair?'])->assertOk()->json('reply');

        $this->assertSame('Narito ang mga job fair.', $reply);
    }

    public function test_a_reply_made_only_of_codes_becomes_the_no_answer_message(): void
    {
        $this->fakeGemini('[[LIST_JOB_FAIRS]] [[SEARCH_JOB_VACANCIES]]');

        $reply = $this->postJson('/api/chat/public', ['message' => 'Kailan po ang job fair?'])->assertOk()->json('reply');

        $this->assertIsString($reply);
        $this->assertNotSame('', trim($reply));
        $this->assertStringNotContainsString('[[', $reply);
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

    public function test_ilocano_is_its_own_language_and_never_assumed_to_be_pangasinan(): void
    {
        $this->fakeGemini('Reply text.');

        $this->postJson('/api/chat/public', [
            'message' => 'Requirements?',
            'history' => [['role' => 'user', 'text' => 'Answer in Ilocano please']],
        ])->assertOk();

        Http::assertSent(function (Request $request): bool {
            $instruction = $this->instruction($request);

            return str_contains($instruction, self::THIS_TURN . ': The visitor asked you to use Ilocano')
                && str_contains($instruction, 'not Pangasinan or Tagalog')
                // The standing rule: Ilocano gets Ilocano, and the province is no reason for Pangasinan.
                && str_contains($instruction, 'do not mistake Ilocano for Pangasinan')
                && str_contains($instruction, 'is never a reason to reply in Pangasinan');
        });
    }

    public function test_the_prompt_keeps_internal_labels_away_from_the_visitor(): void
    {
        $this->fakeGemini('Reply text.');

        $this->postJson('/api/chat/public', ['message' => 'How do I register?'])->assertOk();

        Http::assertSent(fn (Request $request) => str_contains(
            $this->instruction($request),
            'never show their internal labels to the visitor — words such as GUEST'
        ));
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
