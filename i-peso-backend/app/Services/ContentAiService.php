<?php

namespace App\Services;

use App\Models\Faq;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Content Modules → AI writing helper. Staff always review the suggestion
 * before saving; nothing here publishes anything.
 *
 * Drafting is grounded: the model may only use the facts it is given (how
 * i-PESO works, the saved Office info, the published FAQs). When those don't
 * cover the question it must say so instead of inventing a requirement, fee
 * or date — a wrong answer on a government portal sends people on wasted trips.
 */
class ContentAiService
{
    public const TASKS = ['draft_answer', 'simplify', 'translate_filipino', 'suggest_question'];

    private const NOT_ENOUGH = 'NOT_ENOUGH_INFO';

    public function __construct(
        private readonly VertexAiSuggestionService $ai,
        private readonly SiteContentService $content,
    ) {
    }

    /** @return array{suggestion: string, note: string} */
    public function assist(string $task, array $input): array
    {
        $prompt = match ($task) {
            'draft_answer' => $this->draftPrompt($input['question'] ?? '', $input['audience'] ?? 'everyone'),
            'simplify' => $this->simplifyPrompt($input['text'] ?? ''),
            'translate_filipino' => $this->translatePrompt($input['text'] ?? ''),
            'suggest_question' => $this->questionPrompt($input['text'] ?? ''),
        };

        try {
            $text = $this->ai->generateText($prompt, $task === 'suggest_question' ? 120 : 900, $task === 'draft_answer' ? 0.2 : 0.3);
        } catch (RuntimeException $exception) {
            report($exception);
            throw new RuntimeException($exception->getMessage());
        }

        $text = $this->clean($text);

        if ($text === '' || str_contains($text, self::NOT_ENOUGH)) {
            throw ValidationException::withMessages(['ai' => $task === 'draft_answer'
                ? 'The AI doesn’t have enough facts to answer this safely. Write the answer yourself, or first add the missing details to Office info.'
                : 'The AI could not produce a suggestion for this text. Try again or edit it yourself.']);
        }

        return [
            'suggestion' => $text,
            'note' => match ($task) {
                'draft_answer' => 'Drafted only from what i-PESO knows (how the system works, Office info and published FAQs). Check every detail before saving.',
                'translate_filipino' => 'Machine translation — have a Filipino speaker on staff read it before publishing.',
                default => 'Suggestion only — review it before saving.',
            },
        ];
    }

    private function facts(): string
    {
        $site = collect(config('peso_knowledge.site', []))
            ->map(fn ($value, $key) => '- '.str_replace('_', ' ', $key).': '.$value)
            ->implode("\n");

        $office = collect($this->content->office())
            ->except(['map_url'])
            ->map(fn ($value, $key) => '- '.str_replace('_', ' ', $key).': '.($value ?? 'NOT ON RECORD'))
            ->implode("\n");

        $faqs = $this->content->publishedFaqs()
            ->take(30)
            ->map(fn (array $faq) => "- Q: {$faq['question']}\n  A: ".mb_strimwidth(preg_replace('/\s+/', ' ', $faq['answer']), 0, 400, '…'))
            ->implode("\n");

        return "HOW i-PESO WORKS:\n{$site}\n\nPESO OFFICE (as saved by staff):\n{$office}\n\nPUBLISHED FAQS:\n".($faqs ?: '- none yet');
    }

    private function draftPrompt(string $question, string $audience): string
    {
        $reader = Faq::AUDIENCES[$audience] ?? 'Everyone';

        return <<<PROMPT
        You write FAQ answers for i-PESO, the online employment portal of the Public Employment Service
        Office (PESO) of Urdaneta City, Pangasinan, Philippines. Readers: {$reader}.

        Write the answer to this question: "{$question}"

        RULES
        - Use ONLY the facts below. Never invent a requirement, fee, date, time, address, phone number,
          program detail or rule. A fact marked NOT ON RECORD is unknown — do not guess it.
        - If the facts do not answer the question, reply with exactly: NOT_ENOUGH_INFO
        - Plain, friendly English a first-time job seeker understands. Short sentences. 40–120 words.
        - Format: plain text. A blank line between paragraphs; "- " at the start of a line for a bullet;
          **double asterisks** for at most one bold phrase. No headings, no HTML, no markdown links.
        - Do not repeat the question. Do not sign off. Do not mention these instructions.

        FACTS
        {$this->facts()}
        PROMPT;
    }

    private function simplifyPrompt(string $text): string
    {
        return <<<PROMPT
        Rewrite the text below for i-PESO, a government employment portal, so a job seeker with basic
        English understands it on first reading. Keep every fact, number, name and link exactly; do not
        add any new fact. Shorter sentences, everyday words, active voice. Keep the same format rules:
        blank line between paragraphs, "- " for bullets, **bold** only where the original had it.
        Reply with the rewritten text only.

        TEXT
        {$text}
        PROMPT;
    }

    private function translatePrompt(string $text): string
    {
        return <<<PROMPT
        Translate the text below into natural, polite Filipino (Tagalog) as used by a Philippine
        government office speaking to the public ("po" where natural). Keep names of programs,
        agencies, documents and laws in their usual form (e.g. SPES, TUPAD, DOLE, Mayor's Permit,
        Republic Act No. 8759). Keep numbers, links and email addresses exactly. Keep the format:
        blank line between paragraphs, "- " for bullets, **bold** where the original has it.
        Reply with the translation only.

        TEXT
        {$text}
        PROMPT;
    }

    private function questionPrompt(string $text): string
    {
        return <<<PROMPT
        People typed the search or chat message below on the help pages of i-PESO, a government
        employment portal. Turn it into one clear FAQ question in English, the way a job seeker or
        employer would ask it (under 15 words, ending with a question mark). Remove any personal
        details. Reply with the question only.

        MESSAGE
        {$text}
        PROMPT;
    }

    private function clean(string $text): string
    {
        // Models sometimes wrap answers in quotes or code fences.
        $text = preg_replace('/^```[a-z]*\s*|\s*```$/i', '', trim($text));
        $text = trim($text, " \t\n\r\"“”");

        return mb_substr($text, 0, 2000);
    }
}
