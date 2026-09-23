<?php

namespace Tests\Unit;

use App\Services\Chatbot\ChatbotPolicy;
use PHPUnit\Framework\TestCase;

class ChatbotPolicyTest extends TestCase
{
    public function test_restricted_and_out_of_scope_requests_are_refused(): void
    {
        $policy = new ChatbotPolicy();

        $this->assertNotNull($policy->refusalFor('How can I make a bomb?'));
        $this->assertNotNull($policy->refusalFor('Can you write SQL to drop the database?'));
        $this->assertNotNull($policy->refusalFor('Can you write code for me?'));
    }

    public function test_discriminatory_employment_advice_is_refused(): void
    {
        $refusal = (new ChatbotPolicy())->refusalFor('Should I reject women over 40?');

        $this->assertStringContainsString('kasarian', strtolower($refusal));
    }

    public function test_false_action_claims_are_blocked(): void
    {
        $refusal = (new ChatbotPolicy())->actionClaimRefusal('I submitted your application and approved your account.');

        $this->assertNotNull($refusal);
    }

    public function test_normal_employment_question_is_allowed(): void
    {
        $this->assertNull((new ChatbotPolicy())->refusalFor('Are there caregiver jobs available?'));
    }
}