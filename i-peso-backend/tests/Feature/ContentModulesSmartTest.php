<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Faq;
use App\Services\ContentInsightService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

/** Content Modules: the wider content types and the smart features (plan §9). */
class ContentModulesSmartTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStaffTables();
        if (! Schema::hasTable('site_contents')) {
            (require database_path('migrations/2026_11_13_000005_create_site_content_tables.php'))->up();
        }
        if (! Schema::hasTable('faq_feedback')) {
            (require database_path('migrations/2026_11_13_000006_create_content_insight_tables.php'))->up();
        }
        config([
            'peso_knowledge.office.hours' => null,
            'services.chatbot.gap_logging' => true,
            'services.gemini.key' => 'test-gemini-key',
            'services.gemini.base_url' => 'https://generativelanguage.googleapis.com/v1beta',
            'services.gemini.model' => 'gemini-test',
            'services.gemini.timeout' => 20,
        ]);
    }

    // ── Wider content ─────────────────────────────────────────────────────

    public function test_about_page_and_landing_switches_are_editable_and_public(): void
    {
        $this->getJson('/api/public/site-content')
            ->assertOk()
            ->assertJsonPath('about.mission', null)
            ->assertJsonPath('about.services.0.title', 'Job matching and referral')
            ->assertJsonPath('landing.show_sections.programs', true);

        Sanctum::actingAs($this->admin());
        $sections = $this->getJson('/api/admin/site-content')->assertOk()->json('sections');

        $about = $sections['about']['values'];
        $about['mission'] = 'To bring decent work closer to every Urdaneteño.';
        $about['services'][] = ['title' => 'Career counseling', 'description' => 'One-on-one guidance at the office.', 'audience' => 'seekers', 'link_label' => null, 'link_url' => null];
        $this->putJson('/api/admin/site-content/about', ['version' => 0, 'values' => $about])->assertOk();

        $landing = $sections['landing']['values'];
        $landing['show_sections']['programs'] = false;
        $this->putJson('/api/admin/site-content/landing', ['version' => 0, 'values' => $landing])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/site-content')
            ->assertJsonPath('about.mission', 'To bring decent work closer to every Urdaneteño.')
            ->assertJsonCount(6, 'about.services')
            ->assertJsonPath('landing.show_sections.programs', false)
            ->assertJsonPath('landing.show_sections.faq', true)
            ->assertJsonMissingPath('mobile_welcome');
    }

    public function test_new_sections_are_validated(): void
    {
        Sanctum::actingAs($this->admin());
        $sections = $this->getJson('/api/admin/site-content')->json('sections');

        $about = $sections['about']['values'];
        $about['services'][0]['link_url'] = 'javascript:alert(1)';
        $about['services'][1]['audience'] = 'aliens';
        $this->putJson('/api/admin/site-content/about', ['version' => 0, 'values' => $about])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values.services.0.link_url', 'values.services.1.audience']);

        $landing = $sections['landing']['values'];
        $landing['show_sections']['hero'] = false;
        $this->putJson('/api/admin/site-content/landing', ['version' => 0, 'values' => $landing])
            ->assertStatus(422)->assertJsonValidationErrors(['values.show_sections']);
    }

    // ── Learning from readers ─────────────────────────────────────────────

    public function test_one_helpful_vote_per_reader_which_they_can_change(): void
    {
        $faq = $this->faq(['question' => 'Is registration free?']);
        $draft = $this->faq(['question' => 'Draft', 'is_published' => false]);

        $this->postJson("/api/public/faqs/{$faq->id}/feedback", ['helpful' => true])->assertOk();
        $this->postJson("/api/public/faqs/{$faq->id}/feedback", ['helpful' => true])->assertOk();
        $this->assertSame(1, DB::table('faq_feedback')->count());

        $this->postJson("/api/public/faqs/{$faq->id}/feedback", ['helpful' => false])->assertOk();
        $this->assertSame(0, (int) DB::table('faq_feedback')->value('helpful'));

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.9'])->postJson("/api/public/faqs/{$faq->id}/feedback", ['helpful' => true])->assertOk();
        $this->assertSame(2, DB::table('faq_feedback')->count());

        $this->postJson("/api/public/faqs/{$draft->id}/feedback", ['helpful' => true])->assertNotFound();

        Sanctum::actingAs($this->admin());
        $row = collect($this->getJson('/api/admin/faqs')->json('data'))->firstWhere('id', $faq->id);
        $this->assertSame(1, $row['helpful_votes']);
        $this->assertSame(1, $row['unhelpful_votes']);
    }

    public function test_empty_searches_are_recorded_without_personal_details_once_per_reader(): void
    {
        $this->postJson('/api/public/help/search-misses', ['term' => 'ab'])->assertStatus(422);
        $this->postJson('/api/public/help/search-misses', ['term' => 'TESDA scholarship juan@mail.com 09171234567'])->assertStatus(202);
        $this->postJson('/api/public/help/search-misses', ['term' => 'tesda scholarship juan@mail.com 09171234567'])->assertStatus(202);

        $this->assertSame(1, DB::table('help_search_misses')->count());
        $row = DB::table('help_search_misses')->first();
        $this->assertSame('TESDA scholarship [email] [number]', $row->term);
        $this->assertSame('tesda scholarship', $row->normalized);
    }

    public function test_the_assistant_flags_what_it_could_not_answer_and_the_marker_never_reaches_the_visitor(): void
    {
        Http::fake(['*generateContent*' => Http::response(['candidates' => [['content' => ['role' => 'model', 'parts' => [[
            'text' => 'Wala po akong impormasyon tungkol diyan. Pakitanong sa PESO office. [[NO_ANSWER]]',
        ]]]]]])]);

        $reply = $this->postJson('/api/chat/public', ['message' => 'May libreng TESDA training ba? Call me 0917 123 4567'])
            ->assertOk()
            ->json();

        $this->assertStringNotContainsString('NO_ANSWER', json_encode($reply));
        $this->assertSame(1, DB::table('chatbot_gaps')->count());
        $gap = DB::table('chatbot_gaps')->first();
        $this->assertSame('guest', $gap->audience);
        $this->assertStringNotContainsString('0917', $gap->question);

        Http::assertSent(fn (HttpRequest $request) => str_contains(data_get($request->data(), 'systemInstruction.parts.0.text', ''), '[[NO_ANSWER]]'));

        config(['services.chatbot.gap_logging' => false]);
        $this->postJson('/api/chat/public', ['message' => 'Another unknown thing?'])->assertOk();
        $this->assertSame(1, DB::table('chatbot_gaps')->count());
    }

    public function test_insights_group_reports_suggest_the_closest_faq_and_can_be_resolved(): void
    {
        $this->faq(['question' => 'How do I reset my password?', 'answer' => 'Use the Forgot password link.']);
        $insights = app(ContentInsightService::class);
        foreach (['Reset password', 'reset password!', 'RESET PASSWORD'] as $i => $term) {
            DB::table('help_search_misses')->insert(['term' => $term, 'normalized' => ContentInsightService::normalize($term), 'source' => 'public', 'created_at' => now()->subMinutes($i)]);
        }
        $insights->recordChatbotGap('Saan ang TESDA office?', 'seeker');
        $insights->recordChatbotGap('saan ang tesda office', 'guest');

        Sanctum::actingAs($this->staffWith(['constituent_crm' => 'manage'], 'frontdesk@example.test'));
        $data = $this->getJson('/api/admin/content-modules/insights')->assertOk()->json();

        $this->assertSame(3, $data['missed_searches'][0]['count']);
        $this->assertSame('How do I reset my password?', $data['missed_searches'][0]['closest_faq']['question']);
        $this->assertSame(2, $data['chatbot_gaps'][0]['count']);
        $this->assertNull($data['chatbot_gaps'][0]['closest_faq']);

        $this->postJson('/api/admin/content-modules/insights/resolve', ['kind' => 'search', 'normalized' => 'reset password'])
            ->assertOk()->assertJsonPath('resolved', 3);
        $this->getJson('/api/admin/content-modules/insights')->assertJsonCount(0, 'missed_searches');
    }

    public function test_reader_insights_expire_after_ninety_days(): void
    {
        DB::table('chatbot_gaps')->insert(['question' => 'old', 'normalized' => 'old', 'audience' => 'guest', 'created_at' => now()->subDays(91)]);
        DB::table('chatbot_gaps')->insert(['question' => 'new', 'normalized' => 'new', 'audience' => 'guest', 'created_at' => now()->subDays(5)]);

        $this->artisan('site-content:prune-history')->assertSuccessful();

        $this->assertSame(['new'], DB::table('chatbot_gaps')->pluck('question')->all());
    }

    // ── Health check ──────────────────────────────────────────────────────

    public function test_the_health_check_finds_what_to_fix(): void
    {
        $this->faq(['question' => 'How do I register as a job seeker?']);
        $this->faq(['question' => 'How to register as job seeker?']);
        $this->faq(['question' => 'Where are the job fairs?', 'link_label' => 'Open', 'link_url' => '/seeker/no-such-page']);
        $old = $this->faq(['question' => 'Old question about permits']);
        Faq::query()->whereKey($old->id)->update(['updated_at' => now()->subDays(200)]);

        Sanctum::actingAs($this->admin());
        $health = $this->getJson('/api/admin/content-modules/health')->assertOk()->json();

        $ids = array_column($health['checks'], 'id');
        $this->assertContains('office_blank', $ids);
        $this->assertContains('faq_duplicates', $ids);
        $this->assertContains('faq_bad_links', $ids);
        $this->assertContains('faq_stale', $ids);
        $this->assertContains('privacy_notice', $ids);
        $this->assertLessThan(100, $health['score']);
        $this->assertSame('warn', $health['checks'][0]['status']);

        $links = collect($health['checks'])->firstWhere('id', 'faq_bad_links');
        $this->assertSame('Where are the job fairs?', $links['items'][0]['label']);
    }

    public function test_link_and_similarity_helpers(): void
    {
        $insights = app(ContentInsightService::class);
        $this->assertTrue($insights->isKnownPath('/seeker/job-fairs'));
        $this->assertTrue($insights->isKnownPath('/employer/reports/placement-report'));
        $this->assertTrue($insights->isKnownPath('/help'));
        $this->assertFalse($insights->isKnownPath('/seeker/jobs'));

        $this->assertGreaterThanOrEqual(0.6, ContentInsightService::similarity('How do I reset my password?', 'reset password'));
        $this->assertLessThan(0.3, ContentInsightService::similarity('How do I reset my password?', 'Where is the office?'));
    }

    // ── AI writing helper ─────────────────────────────────────────────────

    public function test_the_ai_helper_drafts_from_known_facts_and_refuses_to_guess(): void
    {
        config(['services.vertex_ai.enabled' => true, 'services.vertex_ai.gemini_api_key' => 'test-key', 'services.vertex_ai.model' => 'gemini-test']);
        Http::fakeSequence('*generateContent*')
            ->push(['candidates' => [['content' => ['parts' => [['text' => '"No. Registering on i-PESO is free."']]]]]])
            ->push(['candidates' => [['content' => ['parts' => [['text' => 'NOT_ENOUGH_INFO']]]]]]);

        Sanctum::actingAs($this->admin());
        $this->postJson('/api/admin/content-modules/ai-assist', ['task' => 'draft_answer', 'question' => 'Do I pay to register?', 'audience' => 'everyone'])
            ->assertOk()
            ->assertJsonPath('suggestion', 'No. Registering on i-PESO is free.');

        $this->postJson('/api/admin/content-modules/ai-assist', ['task' => 'draft_answer', 'question' => 'What is the office Wi-Fi password?'])
            ->assertStatus(422)->assertJsonValidationErrors(['ai']);

        Http::assertSent(fn (HttpRequest $request) => str_contains(json_encode($request->data()), 'Use ONLY the facts below'));
    }

    public function test_the_ai_helper_reports_when_it_is_off_and_needs_edit_access(): void
    {
        config(['services.vertex_ai.enabled' => false]);
        Sanctum::actingAs($this->admin());
        $this->postJson('/api/admin/content-modules/ai-assist', ['task' => 'simplify', 'text' => 'Some text.'])
            ->assertStatus(503)->assertJsonPath('message', 'The AI writing helper is turned off on this server.');

        Sanctum::actingAs($this->staffWith(['constituent_crm' => 'view'], 'viewer@example.test'));
        $this->postJson('/api/admin/content-modules/ai-assist', ['task' => 'simplify', 'text' => 'Some text.'])->assertForbidden();
        $this->getJson('/api/admin/content-modules/health')->assertOk();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function faq(array $overrides = []): Faq
    {
        return Faq::create([
            'question' => 'Question?', 'answer' => 'Answer.', 'audience' => 'everyone', 'topic' => 'office',
            'is_published' => true, ...$overrides,
        ]);
    }

    private function admin(): Administrator
    {
        return Administrator::query()->where('email', 'cm-admin@example.test')->first() ?? Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => 'cm-admin@example.test',
            'password' => 'password123', 'role' => 'administrator', 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function staffWith(array $permissions, string $email): Administrator
    {
        $role = AdminRole::create(['name' => 'Role '.$email, 'slug' => 'role-'.md5($email), 'permissions' => $permissions]);

        return Administrator::create([
            'first_name' => 'Staff', 'last_name' => 'Member', 'email' => $email, 'password' => 'password123',
            'role' => 'staff', 'admin_role_id' => $role->id, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }
}
