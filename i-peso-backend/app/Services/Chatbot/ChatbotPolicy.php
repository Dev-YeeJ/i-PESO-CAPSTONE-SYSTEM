<?php

namespace App\Services\Chatbot;

/** Deterministic policy checks that run before and after the model. */
class ChatbotPolicy
{
    public function refusalFor(string $message): ?string
    {
        $text = strtolower($message);

        if ($this->containsAny($text, [
            'kill myself', 'suicide', 'self harm', 'make a bomb', 'how to hack',
            'steal password', 'buy illegal drugs', 'sexual assault', 'porn', 'rape',
        ])) {
            return 'Pasensya po, hindi ako makakatulong sa mapanganib, ilegal, o hindi naaangkop na kahilingan. Maaari po kitang tulungan sa trabaho, aplikasyon, o serbisyo ng PESO.';
        }

        if ($this->containsAny($text, [
            'reject women', 'reject men', 'avoid women', 'avoid men', 'over 40', 'under 25',
            'because she is pregnant', 'because he is disabled', 'avoid pwd', 'reject pwd',
            'based on religion', 'based on race', 'based on nationality', 'based on marital status',
        ])) {
            return 'Hindi ako makakapagrekomenda ng pagtanggap o pagtanggi ng aplikante batay sa kasarian, edad, kapansanan, relihiyon, lahi, nationality, pagbubuntis, o marital status. Gumamit lamang ng patas at job-related na qualifications at sundin ang patakaran ng PESO at batas.';
        }

        if ($this->containsAny($text, ['write sql', 'run sql', 'drop table', 'delete database', 'execute command', 'ignore previous instructions'])) {
            return 'Hindi ako tumatanggap ng arbitrary commands o database instructions. Maaari po kitang tulungan sa lehitimong trabaho, aplikasyon, o serbisyo ng PESO.';
        }

        if ($this->containsAny($text, ['recipe', 'write code', 'politics', 'sports score', 'joke about'])) {
            return 'Nakadisenyo ako para sa trabaho, aplikasyon, PESO services, at i-PESO. Maaari po kitang tulungan sa mga paksang iyon.';
        }

        return null;
    }

    public function actionClaimRefusal(string $response): ?string
    {
        $text = strtolower($response);
        if ($this->containsAny($text, [
            'i submitted your application', 'i applied for you', 'i withdrew your application',
            'i changed your profile', 'i changed your status', 'your account is approved',
            'your account has been verified', 'i approved', 'i rejected the applicant',
        ])) {
            return 'Hindi ako nagsusumite, nagwi-withdraw, nag-aapprove, nagre-reject, o nagbabago ng records. Maaari ko lamang ipaliwanag ang impormasyong nasa system; gamitin ang iyong dashboard o makipag-ugnayan sa PESO staff para sa action.';
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