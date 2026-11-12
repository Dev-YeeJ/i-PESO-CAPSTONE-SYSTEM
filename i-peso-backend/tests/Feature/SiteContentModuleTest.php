<?php

namespace Tests\Feature;

use App\Models\AdminRole;
use App\Models\Administrator;
use App\Models\Employer;
use App\Models\Faq;
use App\Models\JobSeeker;
use App\Models\PolicyVersion;
use App\Models\SiteContentRevision;
use App\Services\SiteContentService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesStaffTables;
use Tests\TestCase;

class SiteContentModuleTest extends TestCase
{
    use CreatesStaffTables, DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStaffTables();
        if (! Schema::hasTable('site_contents')) {
            (require database_path('migrations/2026_11_13_000005_create_site_content_tables.php'))->up();
        }
        config([
            'peso_knowledge.office.address' => 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan',
            'peso_knowledge.office.email' => 'pesourdanetacity@gmail.com',
            'peso_knowledge.office.phone' => '0923 810 2011',
            'peso_knowledge.office.hours' => null,
        ]);
    }

    // ── Office info ───────────────────────────────────────────────────────

    public function test_office_info_starts_from_the_config_values_and_a_save_shows_everywhere(): void
    {
        $this->getJson('/api/public/site-content')
            ->assertOk()
            ->assertJsonPath('office.email', 'pesourdanetacity@gmail.com')
            ->assertJsonPath('office.hours', null)
            ->assertJsonPath('landing.headline_highlight', 'Perfect Match');

        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $section = $this->getJson('/api/admin/site-content')->assertOk()->json('sections.office');
        $this->assertSame(0, $section['version']);

        $this->putJson('/api/admin/site-content/office', [
            'version' => 0,
            'values' => [...$section['values'], 'hours' => 'Monday to Friday, 8:00 AM - 5:00 PM', 'phone' => '0917 123 4567'],
        ])->assertOk()
            ->assertJsonPath('section.version', 1)
            ->assertJsonPath('section.values.hours', 'Monday to Friday, 8:00 AM - 5:00 PM')
            ->assertJsonPath('section.updated_by', 'PESO Manager');

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/site-content')->assertOk()->assertJsonPath('office.hours', 'Monday to Friday, 8:00 AM - 5:00 PM');
        $this->getJson('/api/public/faqs')->assertOk()->assertJsonPath('office.phone', '0917 123 4567');

        $this->assertDatabaseHas('activity_logs', ['action' => 'site_content_updated', 'description' => 'Updated office information (office hours, phone).']);
        $this->assertSame(1, SiteContentRevision::query()->where('content_key', 'office')->count());
    }

    public function test_clearing_a_field_means_not_on_record_and_overrides_the_config_fallback(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $values = $this->getJson('/api/admin/site-content')->json('sections.office.values');

        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [...$values, 'phone' => '']])
            ->assertOk()
            ->assertJsonPath('section.values.phone', null);

        $this->assertNull(app(SiteContentService::class)->office()['phone']);
    }

    public function test_a_stale_editor_gets_a_conflict_instead_of_overwriting(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);
        $values = $this->getJson('/api/admin/site-content')->json('sections.office.values');

        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [...$values, 'hours' => 'First']])->assertOk();
        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [...$values, 'hours' => 'Second']])
            ->assertStatus(409);

        $this->assertSame('First', app(SiteContentService::class)->office()['hours']);
    }

    public function test_office_and_landing_values_are_validated(): void
    {
        Sanctum::actingAs($this->admin());
        $sections = $this->getJson('/api/admin/site-content')->json('sections');

        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [
            ...$sections['office']['values'], 'phone' => 'call us!', 'facebook' => 'https://evil.example/peso', 'email' => 'not-an-email',
        ]])->assertStatus(422)->assertJsonValidationErrors(['values.phone', 'values.facebook', 'values.email']);

        $landing = $sections['landing']['values'];
        $this->putJson('/api/admin/site-content/landing', ['version' => 0, 'values' => [
            ...$landing,
            'headline_lead' => str_repeat('x', 41),
            'features' => array_slice($landing['features'], 0, 3),
            'subheadline' => '',
        ]])->assertStatus(422)->assertJsonValidationErrors(['values.headline_lead', 'values.features', 'values.subheadline']);

        $landing['features'][0]['icon'] = 'skull';
        $this->putJson('/api/admin/site-content/landing', ['version' => 0, 'values' => $landing])
            ->assertStatus(422)->assertJsonValidationErrors(['values.features.0.icon']);
    }

    public function test_history_can_restore_an_earlier_version_and_reset_goes_back_to_the_default(): void
    {
        Sanctum::actingAs($this->admin());
        $landing = $this->getJson('/api/admin/site-content')->json('sections.landing.values');

        $this->putJson('/api/admin/site-content/landing', ['version' => 0, 'values' => [...$landing, 'headline_tail' => 'Made for Urdaneta']])->assertOk();
        $this->putJson('/api/admin/site-content/landing', ['version' => 1, 'values' => [...$landing, 'headline_tail' => 'Oops']])->assertOk();

        $revisions = $this->getJson('/api/admin/site-content/landing/revisions')->assertOk()->json('revisions');
        $this->assertCount(2, $revisions);
        $this->assertSame(['headline_tail'], $revisions[0]['changed_fields']);
        $first = $revisions[1]['id'];

        $this->postJson("/api/admin/site-content/landing/revisions/{$first}/restore", ['version' => 2])
            ->assertOk()
            ->assertJsonPath('section.values.headline_tail', 'Made for Urdaneta')
            ->assertJsonPath('section.version', 3);

        $this->postJson('/api/admin/site-content/landing/reset', ['version' => 3, 'fields' => ['headline_tail']])
            ->assertOk()
            ->assertJsonPath('section.values.headline_tail', 'Powered by Smart Technology');

        $this->assertDatabaseHas('activity_logs', ['action' => 'site_content_restored']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'site_content_reset']);
    }

    public function test_history_keeps_only_the_newest_twenty_versions(): void
    {
        $admin = $this->admin();
        $service = app(SiteContentService::class);
        for ($i = 1; $i <= 25; $i++) {
            $service->recordRevision(SiteContentRevision::TYPE_SECTION, 'office', ['hours' => "v{$i}"], ['hours'], 'saved', $admin);
        }

        $this->artisan('site-content:prune-history')->assertSuccessful();

        $this->assertSame(20, SiteContentRevision::query()->where('content_key', 'office')->count());
        $this->assertSame('v25', $service->revisions(SiteContentRevision::TYPE_SECTION, 'office', 1)->first()->value['hours']);
    }

    // ── Permissions ───────────────────────────────────────────────────────

    public function test_view_only_staff_can_read_but_not_change_and_crm_staff_manage_only_faqs(): void
    {
        $viewer = $this->staffWith(['configuration' => 'view'], 'viewer@example.test');
        Sanctum::actingAs($viewer);
        $this->getJson('/api/admin/site-content')->assertOk();
        $this->getJson('/api/admin/faqs')->assertOk();
        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => ['hours' => 'x']])->assertForbidden();
        $this->postJson('/api/admin/faqs', $this->faqPayload())->assertForbidden();

        $frontDesk = $this->staffWith(['constituent_crm' => 'manage'], 'frontdesk@example.test');
        Sanctum::actingAs($frontDesk);
        $this->postJson('/api/admin/faqs', $this->faqPayload())->assertCreated();
        $this->getJson('/api/admin/site-content')->assertForbidden();
        $this->getJson('/api/admin/policies')->assertForbidden();

        $crmViewer = $this->staffWith(['constituent_crm' => 'view'], 'crm-viewer@example.test');
        Sanctum::actingAs($crmViewer);
        $this->getJson('/api/admin/faqs')->assertOk();
        $this->postJson('/api/admin/faqs', $this->faqPayload())->assertForbidden();

        $nobody = $this->staffWith(['employment_hub' => 'manage'], 'hub@example.test');
        Sanctum::actingAs($nobody);
        $this->getJson('/api/admin/faqs')->assertForbidden();
    }

    // ── FAQs ──────────────────────────────────────────────────────────────

    public function test_faqs_start_unpublished_and_reach_only_their_audience_once_published(): void
    {
        Sanctum::actingAs($this->admin());
        $everyone = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'Is it free?']))
            ->assertCreated()->assertJsonPath('faq.is_published', false)->json('faq.id');
        $seekers = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'How do I apply?', 'audience' => 'seekers', 'topic' => 'jobs']))->json('faq.id');
        $employers = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'What documents?', 'audience' => 'employers', 'topic' => 'verification']))->json('faq.id');

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/faqs')->assertOk()->assertJsonCount(0, 'faqs');

        Sanctum::actingAs($this->admin('second-admin@example.test'));
        foreach ([$everyone, $seekers, $employers] as $id) {
            $this->postJson("/api/admin/faqs/{$id}/publish")->assertOk();
        }

        $this->app['auth']->forgetGuards();
        $this->assertSame([$everyone], array_column($this->getJson('/api/public/faqs')->json('faqs'), 'id'));

        Sanctum::actingAs($this->seeker());
        $this->assertEqualsCanonicalizing([$everyone, $seekers], array_column($this->getJson('/api/help')->assertOk()->assertJsonPath('role', 'seeker')->json('faqs'), 'id'));

        Sanctum::actingAs($this->employer());
        $this->assertEqualsCanonicalizing([$everyone, $employers], array_column($this->getJson('/api/help')->assertOk()->json('faqs'), 'id'));
    }

    public function test_faq_links_are_limited_to_internal_paths_and_https(): void
    {
        Sanctum::actingAs($this->admin());

        foreach (['javascript:alert(1)', '//evil.example', 'http://insecure.example'] as $bad) {
            $this->postJson('/api/admin/faqs', $this->faqPayload(['link_label' => 'Open', 'link_url' => $bad]))
                ->assertStatus(422)->assertJsonValidationErrors(['link_url']);
        }

        $this->postJson('/api/admin/faqs', $this->faqPayload(['link_label' => 'Open', 'link_url' => '/seeker/job-fairs']))->assertCreated();
    }

    public function test_only_five_everyone_faqs_can_be_featured_on_the_landing_page(): void
    {
        Sanctum::actingAs($this->admin());
        $ids = [];
        for ($i = 1; $i <= 6; $i++) {
            $ids[] = $id = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => "Question {$i}"]))->json('faq.id');
            $this->postJson("/api/admin/faqs/{$id}/publish")->assertOk();
        }
        foreach (array_slice($ids, 0, 5) as $id) {
            $this->postJson("/api/admin/faqs/{$id}/feature", ['featured' => true])->assertOk();
        }

        $this->postJson("/api/admin/faqs/{$ids[5]}/feature", ['featured' => true])
            ->assertStatus(422)->assertJsonValidationErrors(['featured']);

        $seekerOnly = $this->postJson('/api/admin/faqs', $this->faqPayload(['audience' => 'seekers']))->json('faq.id');
        $this->postJson("/api/admin/faqs/{$seekerOnly}/feature", ['featured' => true])->assertStatus(422);

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/site-content')->assertOk()->assertJsonCount(5, 'featured_faqs');
    }

    public function test_reordering_changes_the_reader_order(): void
    {
        Sanctum::actingAs($this->admin());
        $a = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'A']))->json('faq.id');
        $b = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'B']))->json('faq.id');
        $this->postJson("/api/admin/faqs/{$a}/publish");
        $this->postJson("/api/admin/faqs/{$b}/publish");

        $this->putJson('/api/admin/faqs/reorder', ['ids' => [$b, $a]])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->assertSame([$b, $a], array_column($this->getJson('/api/public/faqs')->json('faqs'), 'id'));
    }

    public function test_the_starter_pack_adds_unpublished_drafts_only_once(): void
    {
        Sanctum::actingAs($this->admin());
        $this->getJson('/api/admin/faqs')->assertJsonPath('can_add_starter_pack', true);

        $this->postJson('/api/admin/faqs/starter-pack')->assertCreated();

        $this->assertGreaterThan(5, Faq::query()->count());
        $this->assertSame(0, Faq::query()->published()->count());
        $this->postJson('/api/admin/faqs/starter-pack')->assertStatus(422);
        $this->getJson('/api/admin/faqs')->assertJsonPath('can_add_starter_pack', false);
    }

    public function test_the_assistant_uses_office_info_and_published_faqs_only(): void
    {
        config([
            'services.gemini.key' => 'test-gemini-key',
            'services.gemini.base_url' => 'https://generativelanguage.googleapis.com/v1beta',
            'services.gemini.model' => 'gemini-test',
            'services.gemini.timeout' => 20,
        ]);
        Http::fake(['*generateContent*' => Http::response([
            'candidates' => [['content' => ['role' => 'model', 'parts' => [['text' => 'Bukas po kami.']]]]],
        ])]);

        Sanctum::actingAs($this->admin());
        $values = $this->getJson('/api/admin/site-content')->json('sections.office.values');
        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [...$values, 'hours' => 'Mon-Fri 8 to 5']])->assertOk();
        $published = $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'Is parking available?', 'answer' => 'Yes, beside City Hall.']))->json('faq.id');
        $this->postJson("/api/admin/faqs/{$published}/publish")->assertOk();
        $this->postJson('/api/admin/faqs', $this->faqPayload(['question' => 'Secret draft question?']))->assertCreated();

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/chat/public', ['message' => 'What time are you open?'])->assertOk();

        Http::assertSent(function (HttpRequest $request): bool {
            $prompt = data_get($request->data(), 'systemInstruction.parts.0.text', '');

            return str_contains($prompt, 'hours: Mon-Fri 8 to 5')
                && str_contains($prompt, 'Q: Is parking available?')
                && str_contains($prompt, 'A: Yes, beside City Hall.')
                && ! str_contains($prompt, 'Secret draft question?');
        });
    }

    public function test_the_suspension_message_uses_the_office_email(): void
    {
        Sanctum::actingAs($this->admin());
        $values = $this->getJson('/api/admin/site-content')->json('sections.office.values');
        $this->putJson('/api/admin/site-content/office', ['version' => 0, 'values' => [...$values, 'email' => 'office@urdaneta.example']])->assertOk();

        $this->assertStringContainsString('email office@urdaneta.example', (new JobSeeker())->suspensionMessage());
    }

    // ── Policy pages ──────────────────────────────────────────────────────

    public function test_policy_pages_show_the_original_text_until_a_new_version_is_published(): void
    {
        $this->getJson('/api/public/policies/privacy-policy')
            ->assertOk()
            ->assertJsonPath('current.is_builtin', true)
            ->assertJsonPath('current.version', 1)
            ->assertJsonPath('current.effective_at', '2026-09-09')
            ->assertJsonCount(1, 'versions');
        $this->getJson('/api/public/policies/not-a-policy')->assertNotFound();

        Sanctum::actingAs($this->admin());
        $draft = $this->postJson('/api/admin/policies/privacy-policy/draft')->assertCreated()->json('draft');
        $this->assertSame(2, $draft['version']);
        $this->assertSame('draft', $draft['status']);

        // Readers still see version 1 while the draft is open.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/policies/privacy-policy')->assertJsonPath('current.version', 1);

        Sanctum::actingAs($this->admin('policy-admin@example.test'));
        $sections = $draft['sections'];
        $this->postJson('/api/admin/policies/privacy-policy/draft/publish', ['effective_at' => Carbon::today()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors(['change_note']);

        $this->putJson('/api/admin/policies/privacy-policy/draft', ['sections' => $sections, 'change_note' => 'No change'])->assertOk();
        $this->postJson('/api/admin/policies/privacy-policy/draft/publish', ['effective_at' => Carbon::today()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors(['sections']);

        $sections[] = ['title' => 'Data Protection Officer', 'body' => "PESO has appointed a Data Protection Officer.\n\n- Reach them at {office.email}"];
        $this->putJson('/api/admin/policies/privacy-policy/draft', ['sections' => $sections, 'change_note' => 'Named a Data Protection Officer.'])
            ->assertOk()
            ->assertJsonPath('draft.sections.10.id', 'data-protection-officer');

        $this->postJson('/api/admin/policies/privacy-policy/draft/publish', ['effective_at' => Carbon::yesterday()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors(['effective_at']);
        $this->postJson('/api/admin/policies/privacy-policy/draft/publish', ['effective_at' => Carbon::today()->toDateString()])->assertOk();

        $this->app['auth']->forgetGuards();
        $page = $this->getJson('/api/public/policies/privacy-policy')
            ->assertOk()
            ->assertJsonPath('current.version', 2)
            ->assertJsonPath('current.is_builtin', false)
            ->assertJsonCount(2, 'versions')
            ->json();
        $this->assertSame('Data Protection Officer', end($page['current']['sections'])['title']);

        // The original stays readable.
        $this->getJson('/api/public/policies/privacy-policy/versions/1')
            ->assertOk()
            ->assertJsonPath('requested.is_builtin', true)
            ->assertJsonPath('requested.change_note', 'Original version.');

        $this->assertDatabaseHas('activity_logs', ['action' => 'policy_published']);
        $this->assertSame(2, PolicyVersion::query()->for('privacy-policy')->published()->count());
    }

    public function test_a_version_with_a_future_effective_date_is_announced_but_not_yet_in_effect(): void
    {
        Sanctum::actingAs($this->admin());
        $draft = $this->postJson('/api/admin/policies/terms-of-service/draft')->json('draft');
        $sections = $draft['sections'];
        $sections[0]['body'] .= "\n\nUpdated wording.";
        $this->putJson('/api/admin/policies/terms-of-service/draft', ['sections' => $sections, 'change_note' => 'Clarified acceptance.'])->assertOk();

        $effective = Carbon::today()->addDays(10)->toDateString();
        $this->postJson('/api/admin/policies/terms-of-service/draft/publish', ['effective_at' => $effective])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/public/policies/terms-of-service')
            ->assertOk()
            ->assertJsonPath('current.version', 1)
            ->assertJsonPath('upcoming.version', 2)
            ->assertJsonPath('upcoming.effective_at', $effective);
    }

    public function test_view_only_staff_cannot_start_or_publish_policy_versions(): void
    {
        Sanctum::actingAs($this->staffWith(['configuration' => 'view'], 'policy-viewer@example.test'));
        $this->getJson('/api/admin/policies')->assertOk()->assertJsonCount(3, 'policies');
        $this->postJson('/api/admin/policies/privacy-policy/draft')->assertForbidden();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function faqPayload(array $overrides = []): array
    {
        return [
            'question' => 'Do I pay to register?',
            'answer' => "No.\nAll PESO services are free.",
            'audience' => 'everyone',
            'topic' => 'office',
            ...$overrides,
        ];
    }

    private function admin(string $email = 'site-content-admin@example.test'): Administrator
    {
        return Administrator::query()->where('email', $email)->first() ?? Administrator::create([
            'first_name' => 'PESO', 'last_name' => 'Manager', 'email' => $email,
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

    private function seeker(): JobSeeker
    {
        $id = DB::table('job_seekers')->insertGetId(['email' => fake()->unique()->safeEmail(), 'created_at' => now(), 'updated_at' => now()]);

        return JobSeeker::findOrFail($id);
    }

    private function employer(): Employer
    {
        $id = DB::table('employers')->insertGetId(['email' => fake()->unique()->safeEmail(), 'created_at' => now(), 'updated_at' => now()]);

        return Employer::findOrFail($id);
    }
}
