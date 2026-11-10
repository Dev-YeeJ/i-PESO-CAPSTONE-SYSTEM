<?php

namespace Tests\Unit;

use App\Services\Chatbot\ChatbotMessages;
use App\Services\Chatbot\ChatLanguage;
use PHPUnit\Framework\TestCase;

class ChatLanguageTest extends TestCase
{
    public function test_explicit_pangasinan_requests_are_recognised_in_english_and_filipino(): void
    {
        foreach ([
            'Can you answer in Pangasinan?',
            'Can I ask in Pangasinan?',
            'Please reply in Pangasinan.',
            'Pangasinan language please',
            'Sagutin mo po sa Pangasinan',
            'Pwede ba magtanong sa Pangasinan?',
            'Pangasinan po',
            'Pangasinense',
        ] as $message) {
            $this->assertSame(ChatLanguage::PANGASINAN, ChatLanguage::fromMessages([$message])->explicit(), $message);
        }
    }

    public function test_the_province_name_is_not_a_language_request(): void
    {
        foreach ([
            'Are there jobs in Pangasinan?',
            'May trabaho ba sa Pangasinan?',
            'Taga Urdaneta City, Pangasinan po ako',
            'I live in Pangasinan and need work',
        ] as $message) {
            $this->assertNull(ChatLanguage::fromMessages([$message])->explicit(), $message);
        }
    }

    public function test_a_language_skill_is_not_a_language_request(): void
    {
        foreach (['Magaling ako sa English', 'Marunong po ako mag-English at mag-Tagalog'] as $message) {
            $this->assertNull(ChatLanguage::fromMessages([$message])->explicit(), $message);
        }
    }

    public function test_an_explicit_request_carries_forward_to_later_short_messages(): void
    {
        $language = ChatLanguage::fromMessages(['Answer in Pangasinan please', 'Production operator']);

        $this->assertSame(ChatLanguage::PANGASINAN, $language->explicit());
        $this->assertSame(ChatLanguage::PANGASINAN, $language->forFixedReplies());
    }

    public function test_the_latest_request_wins(): void
    {
        $this->assertSame(
            ChatLanguage::ENGLISH,
            ChatLanguage::fromMessages(['Answer in Pangasinan', 'English please'])->explicit()
        );
        $this->assertSame(
            ChatLanguage::PANGASINAN,
            ChatLanguage::fromMessages(['Answer in English. Actually, answer in Pangasinan.'])->explicit()
        );
    }

    public function test_guess_separates_english_filipino_and_taglish(): void
    {
        $this->assertSame(ChatLanguage::ENGLISH, ChatLanguage::fromMessages(['How do I register for a job?'])->guessed());
        $this->assertSame(ChatLanguage::FILIPINO, ChatLanguage::fromMessages(['Paano po ba mag-register?'])->guessed());
        $this->assertSame(ChatLanguage::MIXED, ChatLanguage::fromMessages(['Paano po mag-apply for the job?'])->guessed());
        $this->assertSame(ChatLanguage::UNKNOWN, ChatLanguage::fromMessages(['Production operator'])->guessed());
    }

    public function test_fixed_messages_follow_the_language_without_inventing_pangasinan(): void
    {
        $filipino = ChatbotMessages::get('off_topic', ChatLanguage::FILIPINO);
        $english = ChatbotMessages::get('off_topic', ChatLanguage::ENGLISH);

        $this->assertStringContainsString('Nakadisenyo ako', $filipino);
        $this->assertStringStartsWith("I'm designed for jobs", $english);
        $this->assertSame($filipino, ChatbotMessages::get('off_topic', ChatLanguage::MIXED));

        // Pangasinan: an honest "not available in Pangasinan yet", then Filipino and English.
        $pangasinan = ChatbotMessages::get('off_topic', ChatLanguage::PANGASINAN);
        $this->assertStringStartsWith(ChatbotMessages::PANGASINAN_UNAVAILABLE, $pangasinan);
        $this->assertStringContainsString($filipino, $pangasinan);
        $this->assertStringContainsString($english, $pangasinan);

        // Can't tell (maybe Pangasinan): both, never a guess at one.
        $this->assertSame($filipino . "\n\n" . $english, ChatbotMessages::get('off_topic', ChatLanguage::UNKNOWN));
    }
}
