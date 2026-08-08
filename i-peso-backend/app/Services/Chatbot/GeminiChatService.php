<?php

namespace App\Services\Chatbot;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Drives one assistant turn against the Gemini API.
 *
 * The flow is a loop, not a single call. Gemini does not answer questions
 * about i-PESO directly — it replies with a `functionCall` asking us to run a
 * lookup. We run it, hand the rows back, and ask again. Usually that resolves
 * in one round; the loop exists because a question like "may trabaho ba, at
 * kailan ang job fair?" legitimately needs two.
 */
class GeminiChatService
{
    /**
     * Safety valve on the tool loop. Each round is a billed API call, so an
     * unbounded loop is both a cost and a latency risk.
     */
    private const MAX_TOOL_ROUNDS = 4;

    public function __construct(private readonly PublicChatTools $tools)
    {
    }

    /**
     * @param  array<int, array{role: string, text: string}>  $history
     *         Oldest first, ending with the visitor's current message.
     */
    public function reply(array $history): string
    {
        $contents = array_map(fn (array $turn) => [
            'role' => $turn['role'] === 'model' ? 'model' : 'user',
            'parts' => [['text' => $turn['text']]],
        ], $history);

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $parts = $this->send($contents);

            $calls = array_values(array_filter(array_map(
                fn (array $part) => $part['functionCall'] ?? null,
                $parts
            )));

            // No tool requested — this is the actual answer.
            if ($calls === []) {
                return $this->extractText($parts);
            }

            // Echo the model's turn back, then answer every call it made in a
            // single following turn. Splitting them across turns teaches the
            // model to stop asking for tools in parallel.
            $contents[] = ['role' => 'model', 'parts' => $this->asMaps($parts)];

            $responses = [];
            foreach ($calls as $call) {
                $name = $call['name'] ?? '';
                $responses[] = [
                    'functionResponse' => [
                        'name' => $name,
                        // Cast for the same reason as asMaps() below: a tool
                        // that returned nothing must still serialise as {}.
                        'response' => (object) $this->tools->execute($name, $call['args'] ?? []),
                    ],
                ];
            }

            $contents[] = ['role' => 'user', 'parts' => $responses];
        }

        Log::warning('[chatbot] tool loop hit MAX_TOOL_ROUNDS without a final answer.');

        return 'Pasensya po, hindi ko po masagot iyan ngayon. Maaari po kayong magtanong sa '
            . 'PESO office ng Urdaneta City. (Sorry — I could not resolve that one.)';
    }

    /**
     * One HTTP round trip. Returns the model's content parts.
     */
    private function send(array $contents): array
    {
        $config = config('services.gemini');

        if (blank($config['key'] ?? null)) {
            throw ChatbotUnavailableException::misconfigured();
        }

        $response = Http::timeout($config['timeout'])
            ->withHeaders(['x-goog-api-key' => $config['key']])
            ->asJson()
            ->post("{$config['base_url']}/models/{$config['model']}:generateContent", [
                'systemInstruction' => ['parts' => [['text' => $this->systemInstruction()]]],
                'contents' => $contents,
                'tools' => [['functionDeclarations' => $this->tools->declarations()]],
                'generationConfig' => [
                    // Low temperature: this assistant recites government
                    // requirements, so we want the least creative reading of
                    // whatever the tools returned.
                    'temperature' => 0.2,
                    'maxOutputTokens' => 800,
                ],
            ]);

        if ($response->status() === 429) {
            throw ChatbotUnavailableException::rateLimited();
        }

        if ($response->failed()) {
            $error = ChatbotUnavailableException::upstreamFailure($response->status(), $response->body());
            Log::error('[chatbot] ' . $error->getMessage());

            throw $error;
        }

        return $response->json('candidates.0.content.parts', []);
    }

    /**
     * Re-encode `functionCall.args` as an object before echoing a model turn back.
     *
     * Gemini sends `"args": {}` when it calls a no-argument tool. PHP decodes
     * that to an empty array, which json_encode then writes back as `[]` — a
     * JSON list. Gemini's proto expects a map there and rejects the whole
     * request with "Proto field is not repeating, cannot start list".
     *
     * Only bites tools whose arguments are all optional, which is exactly why
     * it survives a happy-path test with a required-argument tool.
     */
    private function asMaps(array $parts): array
    {
        foreach ($parts as $index => $part) {
            if (isset($part['functionCall'])) {
                $parts[$index]['functionCall']['args'] = (object) ($part['functionCall']['args'] ?? []);
            }
        }

        return $parts;
    }

    private function extractText(array $parts): string
    {
        $text = trim(implode('', array_map(
            fn (array $part) => $part['text'] ?? '',
            $parts
        )));

        return $text !== ''
            ? $text
            : 'Pasensya po, wala po akong impormasyon tungkol diyan. Maaari po kayong magtanong '
                . 'sa PESO office ng Urdaneta City.';
    }

    /**
     * Render config/peso_knowledge.php into the prompt.
     *
     * Facts with no table behind them — how registration works, what employer
     * verification asks for, where the office is — live in that config rather
     * than in this prompt, so a non-developer can extend the assistant's
     * coverage by filling in a value.
     *
     * Office fields left null are listed explicitly as NOT ON RECORD. Naming
     * them is deliberate: a model told only "you may not know some things"
     * will still improvise an address, whereas one shown the exact list of
     * blanks reliably defers on them.
     */
    private function knowledgeSection(): string
    {
        $knowledge = config('peso_knowledge', ['site' => [], 'office' => []]);

        $label = fn (string $key) => str_replace('_', ' ', $key);

        $site = collect($knowledge['site'] ?? [])
            ->map(fn ($value, $key) => '- ' . $label($key) . ': ' . $value)
            ->implode("\n");

        $known = collect($knowledge['office'] ?? [])->filter(fn ($value) => filled($value));
        $missing = collect($knowledge['office'] ?? [])->reject(fn ($value) => filled($value));

        $office = $known->isEmpty()
            ? '- Nothing about the physical office is on record yet.'
            : $known->map(fn ($value, $key) => '- ' . $label($key) . ': ' . $value)->implode("\n");

        $blanks = $missing->isEmpty()
            ? ''
            : "\n\nNOT ON RECORD — you do NOT know these. If asked, say so and refer the person to "
                . 'the PESO office of Urdaneta City. Never guess a value for any of them: '
                . $missing->keys()->map($label)->implode(', ') . '.';

        // Delimiter deliberately not "REFERENCE": PHP ends an indented heredoc
        // at the first line starting with the identifier, and the body's own
        // first word is REFERENCE.
        return <<<KNOWLEDGE
        REFERENCE — you may state these directly, without calling a tool.

        About the i-PESO system:
        {$site}

        About the PESO office:
        {$office}{$blanks}
        KNOWLEDGE;
    }

    /**
     * The assistant's standing instructions.
     *
     * The grounding rule is the load-bearing part. Without it the model will
     * happily invent requirements and job listings, which on a government
     * employment portal is worse than no chatbot at all.
     */
    private function systemInstruction(): string
    {
        $today = now()->toFormattedDateString();

        return <<<PROMPT
        You are the official assistant for i-PESO, the online employment portal of the Public
        Employment Service Office (PESO) of Urdaneta City, Pangasinan. Today is {$today}.

        You are talking to a visitor who does not have an account yet.

        LANGUAGE
        Mirror the visitor's language exactly. Tagalog question, Tagalog answer. Taglish question,
        Taglish answer. Never switch to a language they did not use. Use "po" naturally in Tagalog.

        GROUNDING — your most important rule
        You have exactly two sources of truth: the REFERENCE section below, and tool results in
        this conversation. Nothing else. Never state a requirement, fee, date, salary, address,
        job, or program that did not come from one of those two. If neither gives you the answer,
        say plainly that you do not have that information and point them to the PESO office of
        Urdaneta City. An honest "I don't know" is always better than a confident guess — people
        make real decisions about work based on your answers, and a wrong address or fee sends
        someone on a wasted trip.

        {$this->knowledgeSection()}

        WHAT YOU CANNOT DO
        You cannot check application status, look up an account, reset a password, or see any
        personal record. If asked, explain that they need to log in to their account, or direct
        them to the PESO office.

        Never ask the visitor for personal information — no full name, address, birth date, ID
        number, or contact details. This is a public chat and nothing personal belongs here.

        HELPING THEM ACT
        Most visitors are deciding whether i-PESO is worth signing up for. When your answer shows
        that it can help them, end with one short concrete next step. Registration is free.

        STYLE
        Be brief — two to four sentences for most answers. Be warm and respectful: many visitors
        are anxious about finding work.

        Reply in plain text only. The chat window does not render markdown, so asterisks and
        hashes appear literally on screen. Never write **bold**, *italics*, or # headings. If a
        list genuinely helps, put each item on its own line starting with "- ".
        PROMPT;
    }
}
