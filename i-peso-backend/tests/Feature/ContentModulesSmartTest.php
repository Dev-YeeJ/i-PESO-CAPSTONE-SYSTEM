<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Faq;
use App\Models\SiteContent;
use App\Services\SiteContentService;
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
            ->assertJsonMissingPath('landing.show_sections.faq')
            ->assertJsonMissingPath('mobile_welcome');
    }

    public function test_an_old_saved_faq_section_switch_is_dropped_and_does_not_block_saving(): void
    {
        // Saved before the landing "Common questions" section was removed.
        SiteContent::query()->create(['key' => 'landing', 'version' => 1, 'value' => [
            'show_sections' => ['announcements' => true, 'features' => true, 'jobs' => false, 'programs' => true, 'faq' => true],
        ]]);
        app(SiteContentService::class)->flush();

        Sanctum::actingAs($this->admin());
        $landing = $this->getJson('/api/admin/site-content')->assertOk()->json('sections.landing');
        $this->assertSame(['announcements' => true, 'features' => true, 'jobs' => false, 'programs' => true], $landing['values']['show_sections']);

        // What the admin form sends back saves cleanly...
        $this->putJson('/api/admin/site-content/landing', ['version' => $landing['version'], 'values' => $landing['values']])->assertOk();

        // ...while a client still sending the old switch is told it no longer exists.
        $this->putJson('/api/admin/site-content/landing', ['version' => $landing['version'] + 1, 'values' => [
            ...$landing['values'], 'show_sections' => [...$landing['values']['show_sections'], 'faq' => true],
        ]])->assertStatus(422)->assertJsonValidationErrors(['values.show_sections']);
    }

    public function test_the_about_org_chart_starts_empty_and_saves_validated_entries(): void
    {
        $this->getJson('/api/public/site-content')->assertOk()->assertJsonPath('about.org_chart', []);

        Sanctum::actingAs($this->admin());
        $about = $this->getJson('/api/admin/site-content')->json('sections.about.values');

        $bad = [...$about, 'org_chart' => [['name' => '', 'position' => 'Clerk', 'level' => 'chief', 'unit' => null]]];
        $this->putJson('/api/admin/site-content/about', ['version' => 0, 'values' => $bad])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values.org_chart.0.name', 'values.org_chart.0.level']);

        $about['org_chart'] = [
            ['name' => '  Ana Cruz ', 'position' => 'PESO Manager', 'level' => 'head', 'unit' => ''],
            ['name' => 'Ben Reyes', 'position' => 'Labor Market Information Officer', 'level' => 'unit_head', 'unit' => 'Labor market information', 'extra' => 'dropped'],
        ];
        $this->putJson('/api/admin/site-content/about', ['version' => 0, 'values' => $about])->assertOk();

        // An editor that doesn't send the chart keeps the saved one.
        unset($about['org_chart']);
        $this->putJson('/api/admin/site-content/about', ['version' => 1, 'values' => $about])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/site-content')
            ->assertJsonCount(2, 'about.org_chart')
            ->assertJsonPath('about.org_chart.0', ['name' => 'Ana Cruz', 'position' => 'PESO Manager', 'level' => 'head', 'unit' => null])
            ->assertJsonMissingPath('about.org_chart.1.extra');
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

    // ── Assistant insights ────────────────────────────────────────────────

    public function test_the_help_page_feedback_endpoints_are_gone(): void
    {
        $faq = $this->faq(['question' => 'Is registration free?']);

        $this->postJson("/api/public/faqs/{$faq->id}/feedback", ['helpful' => true])->assertNotFound();
        $this->postJson('/api/public/help/search-misses', ['term' => 'tesda scholarship'])->assertNotFound();
        $this->assertSame(0, DB::table('faq_feedback')->count());
        $this->assertSame(0, DB::table('help_search_misses')->count());
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

    public function test_insights_group_unanswered_questions_suggest_the_closest_faq_and_can_be_resolved(): void
    {
        $this->faq(['question' => 'How do I reset my password?', 'answer' => 'Use the Forgot password link.']);
        $insights = app(ContentInsightService::class);
        $insights->recordChatbotGap('Saan ang TESDA office?', 'seeker');
        $insights->recordChatbotGap('saan ang tesda office', 'guest');
        foreach (['Reset password', 'reset password!', 'RESET PASSWORD'] as $question) {
            $insights->recordChatbotGap($question, 'guest');
        }

        Sanctum::actingAs($this->staffWith(['constituent_crm' => 'manage'], 'frontdesk@example.test'));
        $data = $this->getJson('/api/admin/content-modules/insights')->assertOk()->json();

        $this->assertArrayNotHasKey('missed_searches', $data);
        $this->assertArrayNotHasKey('faq_feedback', $data);
        $gaps = collect($data['chatbot_gaps'])->keyBy('normalized');
        $this->assertSame(3, $gaps['reset password']['count']);
        $this->assertSame('How do I reset my password?', $gaps['reset password']['closest_faq']['question']);
        $this->assertSame(2, $gaps['saan ang tesda office']['count']);
        $this->assertNull($gaps['saan ang tesda office']['closest_faq']);

        $this->postJson('/api/admin/content-modules/insights/resolve', ['kind' => 'gap', 'normalized' => 'reset password'])
            ->assertOk()->assertJsonPath('resolved', 3);
        $this->postJson('/api/admin/content-modules/insights/resolve', ['kind' => 'search', 'normalized' => 'reset password'])
            ->assertStatus(422);
        $this->assertSame(
            ['saan ang tesda office'],
            array_column($this->getJson('/api/admin/content-modules/insights')->json('chatbot_gaps'), 'normalized')
        );
    }

    public function test_assistant_insights_expire_after_ninety_days(): void
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
        $old = $this->faq(['question' => 'Old question about permits']);
        Faq::query()->whereKey($old->id)->update(['updated_at' => now()->subDays(200)]);

        Sanctum::actingAs($this->admin());
        $health = $this->getJson('/api/admin/content-modules/health')->assertOk()->json();

        $ids = array_column($health['checks'], 'id');
        $this->assertContains('office_blank', $ids);
        $this->assertContains('faq_duplicates', $ids);
        $this->assertContains('faq_stale', $ids);
        $this->assertContains('privacy_notice', $ids);
        $this->assertLessThan(100, $health['score']);
        $this->assertSame('warn', $health['checks'][0]['status']);

        // Help-page-only checks went with the Help page.
        foreach (['faq_bad_links', 'faq_unhelpful', 'missed_searches', 'searches', 'landing_faq_empty'] as $gone) {
            $this->assertNotContains($gone, $ids);
        }
        $this->assertSame(['faqs_published', 'faqs_unpublished', 'chatbot_gaps'], array_keys($health['counts']));
    }

    public function test_similarity_helper(): void
    {
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
