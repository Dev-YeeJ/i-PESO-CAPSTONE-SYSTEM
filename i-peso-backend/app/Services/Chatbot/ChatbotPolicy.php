<?php

namespace App\Services\Chatbot;

use Illuminate\Foundation\Auth\User;

/** Deterministic policy checks that run before and after the model. */
class ChatbotPolicy
{
    public function refusalFor(string $message, ?User $user = null, string $language = ChatLanguage::FILIPINO): ?string
    {
        $text = strtolower($message);

        // Guest constraints
        if ($user === null) {
            if ($this->containsAny($text, [
                'my application', 'apply', 'hire', 'schedule interview', 'post job', 
                'my resume', 'my profile', 'applicant', 'candidates', 'shortlist'
            ])) {
                return ChatbotMessages::get('guest_only', $language);
            }
        }

        if ($this->containsAny($text, [
            'kill myself', 'suicide', 'self harm', 'make a bomb', 'how to hack',
            'steal password', 'buy illegal drugs', 'sexual assault', 'porn', 'rape',
        ])) {
            return ChatbotMessages::get('unsafe', $language);
        }

        if ($this->containsAny($text, [
            'reject women', 'reject men', 'avoid women', 'avoid men', 'over 40', 'under 25',
            'because she is pregnant', 'because he is disabled', 'avoid pwd', 'reject pwd',
            'based on religion', 'based on race', 'based on nationality', 'based on marital status',
        ])) {
            return ChatbotMessages::get('discrimination', $language);
        }

        if ($this->containsAny($text, ['write sql', 'run sql', 'drop table', 'delete database', 'execute command', 'ignore previous instructions'])) {
            return ChatbotMessages::get('commands', $language);
        }

        if ($this->containsAny($text, ['recipe', 'write code', 'politics', 'sports score', 'joke about'])) {
            return ChatbotMessages::get('off_topic', $language);
        }

        return null;
    }

    public function actionClaimRefusal(string $response, string $language = ChatLanguage::FILIPINO): ?string
    {
        $text = strtolower($response);
        if ($this->containsAny($text, [
            'i submitted your application', 'i applied for you', 'i withdrew your application',
            'i changed your profile', 'i changed your status', 'your account is approved',
            'your account has been verified', 'i approved', 'i rejected the applicant',
            'give me the email of', 'give me the number of', 'contact details of', 'address of'
        ])) {
            return ChatbotMessages::get('action_claim', $language);
        }

        return null;
    }

    private function containsAny(string $text, array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            if (str_contains($text, $phrase)) return true;
        }

        return false;
    }
}