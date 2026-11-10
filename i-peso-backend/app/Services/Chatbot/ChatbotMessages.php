<?php

namespace App\Services\Chatbot;

/**
 * The assistant's fixed replies — the ones that never go through the model (policy
 * refusals and fallbacks). These used to be Tagalog only, so an English or Pangasinan
 * speaker got Tagalog whatever the prompt said.
 *
 * Each message exists in Filipino and English only. There are deliberately no Pangasinan
 * versions: nothing in the repository is a reliable Pangasinan reference, and a guessed
 * translation of a safety or privacy notice is worse than none. So for Pangasinan — and
 * for messages we can't place — the reply carries both the Filipino and the English text,
 * and for Pangasinan it says plainly that the notice isn't available in Pangasinan yet,
 * rather than switching language silently. Add Pangasinan text here once a fluent speaker
 * at the PESO office has written and checked it.
 */
final class ChatbotMessages
{
    private const TEXT = [
        'guest_only' => [
            ChatLanguage::FILIPINO => 'Ang feature na ito ay para lamang sa mga registered users. Para malaman ang buong detalye o magamit ito, kailangan niyo pong mag-login o mag-register bilang Job Seeker o Employer.',
            ChatLanguage::ENGLISH => 'This feature is only for registered users. To see the full details or use it, please log in or register as a Job Seeker or Employer.',
        ],
        'unsafe' => [
            ChatLanguage::FILIPINO => 'Pasensya po, hindi ako makakatulong sa mapanganib, ilegal, o hindi naaangkop na kahilingan. Maaari po kitang tulungan sa trabaho, aplikasyon, o serbisyo ng PESO.',
            ChatLanguage::ENGLISH => 'Sorry, I can\'t help with dangerous, illegal, or inappropriate requests. I can help you with jobs, applications, or PESO services.',
        ],
        'discrimination' => [
            ChatLanguage::FILIPINO => 'Hindi ako makakapagrekomenda ng pagtanggap o pagtanggi ng aplikante batay sa kasarian, edad, kapansanan, relihiyon, lahi, nationality, pagbubuntis, o marital status. Gumamit lamang ng patas at job-related na qualifications at sundin ang patakaran ng PESO at batas.',
            ChatLanguage::ENGLISH => 'I can\'t recommend accepting or rejecting an applicant based on sex, age, disability, religion, race, nationality, pregnancy, or marital status. Use only fair, job-related qualifications, and follow PESO policy and the law.',
        ],
        'commands' => [
            ChatLanguage::FILIPINO => 'Hindi ako tumatanggap ng arbitrary commands o database instructions. Maaari po kitang tulungan sa lehitimong trabaho, aplikasyon, o serbisyo ng PESO.',
            ChatLanguage::ENGLISH => 'I don\'t accept arbitrary commands or database instructions. I can help you with genuine jobs, applications, or PESO services.',
        ],
        'off_topic' => [
            ChatLanguage::FILIPINO => 'Nakadisenyo ako para sa trabaho, aplikasyon, PESO services, at i-PESO. Maaari po kitang tulungan sa mga paksang iyon.',
            ChatLanguage::ENGLISH => 'I\'m designed for jobs, applications, PESO services, and i-PESO. I can help you with those topics.',
        ],
        'action_claim' => [
            ChatLanguage::FILIPINO => 'Hindi ako nagsusumite, nagwi-withdraw, nag-aapprove, nagre-reject, nagbabago ng records, o nagbibigay ng personal contact details ng ibang users. Maaari ko lamang ipaliwanag ang impormasyong nasa system; gamitin ang iyong dashboard o makipag-ugnayan sa PESO staff para sa action.',
            ChatLanguage::ENGLISH => 'I don\'t submit, withdraw, approve, or reject anything, change records, or share other users\' personal contact details. I can only explain the information in the system; use your dashboard or contact PESO staff to take action.',
        ],
        'no_answer' => [
            ChatLanguage::FILIPINO => 'Pasensya po, wala po akong impormasyon tungkol diyan. Maaari po kayong magtanong sa PESO office ng Urdaneta City.',
            ChatLanguage::ENGLISH => 'Sorry, I don\'t have information about that. You can ask the PESO office of Urdaneta City.',
        ],
        'unresolved' => [
            ChatLanguage::FILIPINO => 'Pasensya po, hindi ko po masagot iyan ngayon. Maaari po kayong magtanong sa PESO office ng Urdaneta City.',
            ChatLanguage::ENGLISH => 'Sorry, I couldn\'t answer that just now. You can ask the PESO office of Urdaneta City.',
        ],
    ];

    /** Said (in Filipino and English) when the visitor asked for Pangasinan. */
    public const PANGASINAN_UNAVAILABLE = 'Paumanhin po, wala pa pong bersyong Pangasinan ang paalalang ito. (Sorry, this notice is not available in Pangasinan yet.)';

    public static function get(string $key, string $language = ChatLanguage::FILIPINO): string
    {
        $text = self::TEXT[$key] ?? self::TEXT['no_answer'];

        return match ($language) {
            ChatLanguage::ENGLISH => $text[ChatLanguage::ENGLISH],
            // Taglish speakers read the Filipino text fine; it's what they always got.
            ChatLanguage::FILIPINO, ChatLanguage::MIXED => $text[ChatLanguage::FILIPINO],
            ChatLanguage::PANGASINAN => self::PANGASINAN_UNAVAILABLE . "\n\n"
                . $text[ChatLanguage::FILIPINO] . "\n\n" . $text[ChatLanguage::ENGLISH],
            // Possibly Pangasinan (or too short to tell): give both, never guess one.
            default => $text[ChatLanguage::FILIPINO] . "\n\n" . $text[ChatLanguage::ENGLISH],
        };
    }
}
