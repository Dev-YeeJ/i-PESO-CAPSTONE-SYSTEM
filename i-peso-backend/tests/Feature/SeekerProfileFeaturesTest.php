<?php

namespace Tests\Feature;

use App\Models\Administrator;
use App\Models\JobSeeker;
use App\Models\Occupation;
use App\Models\SeekerCertificate;
use App\Models\SeekerEducation;
use App\Models\SeekerSkill;
use App\Models\SeekerWorkExperience;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeekerProfileFeaturesTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
        $this->createSkillCatalogTable();
    }

    public function test_step_one_saves_an_other_disability_specification(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-1', [
            'first_name' => 'Juan',
            'middle_name' => null,
            'last_name' => 'Dela Cruz',
            'suffix' => null,
            'date_of_birth' => '2000-01-01',
            'sex' => 'male',
            'civil_status' => 'single',
            'religion' => 'roman_catholic',
            'height_ft' => 5.5,
            'tin' => null,
            'educ_attainment' => 'College Graduate',
            'address_province' => 'Pangasinan',
            'address_municipality_city' => 'Urdaneta City',
            'address_barangay' => 'Poblacion',
            'address_house_street' => '123 Rizal Street',
            'disabilities' => ['others'],
            'disability_specification' => 'Autism spectrum disorder',
        ])->assertOk();

        $this->assertDatabaseHas('seeker_disabilities', [
            'seeker_id' => $seeker->getKey(),
            'disability_type' => 'others',
            'disability_specification' => 'Autism spectrum disorder',
        ]);
    }

    public function test_step_one_requires_a_specification_for_other_disability(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-1', [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '2000-01-01',
            'sex' => 'male',
            'civil_status' => 'single',
            'religion' => 'roman_catholic',
            'height_ft' => 5.5,
            'educ_attainment' => 'College Graduate',
            'address_province' => 'Pangasinan',
            'address_municipality_city' => 'Urdaneta City',
            'address_barangay' => 'Poblacion',
            'address_house_street' => '123 Rizal Street',
            'disabilities' => ['others'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('disability_specification');
    }

    public function test_optional_education_and_work_history_steps_accept_empty_arrays(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-5', [
            'currently_in_school' => false,
            'educations' => [],
            'dole_skills' => [],
            'technical_skills' => [],
            'soft_skills' => [],
        ])->assertOk();

        $this->postJson('/api/seeker/step-7', [
            'work_experiences' => [],
        ])->assertOk();
    }

    public function test_admin_can_download_the_official_two_page_nsrp_form(): void
    {
        $seeker = $this->createSeeker();
        $admin = Administrator::create([
            'first_name' => 'PESO',
            'last_name' => 'Administrator',
            'email' => fake()->unique()->safeEmail(),
            'mobile_number' => '09170000001',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->get("/api/admin/job-seekers/{$seeker->getKey()}/export-nsrp-pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $response->assertHeader(
            'content-disposition',
            'attachment; filename=NSRP_Form_'.$seeker->getKey().'_'.$seeker->last_name.'.pdf'
        );

        $pdfContent = $response->getContent();
        $this->assertSame(2, preg_match_all('/\/Type\s*\/Page\b/', $pdfContent));
    }

    public function test_step_three_rejects_unknown_occupation_ids(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'local',
            'preferred_locations_details' => ['Urdaneta City, Pangasinan'],
            'occupation_ids' => [999999],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('occupation_ids.0');
    }

    public function test_step_three_saves_controlled_occupations_and_locations(): void
    {
        $seeker = $this->createSeeker();
        $registeredNurse = $this->createOccupation('2221', 'Registered Nurse');
        $nursingAssistant = $this->createOccupation('5321', 'Nursing Assistant');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'local',
            'preferred_locations_details' => ['Urdaneta City, Pangasinan'],
            'occupation_ids' => [$registeredNurse->id, $nursingAssistant->id],
        ])->assertOk();

        $this->assertDatabaseHas('seeker_occupations', [
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => $registeredNurse->id,
            'occupation_title' => 'Registered Nurse',
            'preference_order' => 1,
        ]);
        $this->assertDatabaseHas('job_seekers', [
            'seeker_id' => $seeker->getKey(),
            'preferred_work_location' => 'local',
        ]);
    }

    public function test_step_three_rejects_a_custom_unreviewed_occupation(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'local',
            'preferred_locations_details' => ['Urdaneta City, Pangasinan'],
            'occupation_preferences' => [[
                'occupation_id' => null,
                'raw_job_title' => 'Milk tea crew',
            ]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('occupation_preferences.0.raw_job_title');

        $this->assertDatabaseMissing('seeker_occupations', [
            'seeker_id' => $seeker->getKey(),
            'raw_job_title' => 'Milk tea crew',
        ]);
    }

    public function test_step_three_saves_a_generalized_job_family(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'local',
            'preferred_locations_details' => ['Urdaneta City, Pangasinan'],
            'occupation_preferences' => [[
                'general_term' => 'healthcare work',
            ]],
        ])->assertOk();

        $this->assertDatabaseHas('seeker_occupations', [
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => null,
            'general_term' => 'healthcare work',
            'occupation_title' => 'Healthcare',
            'raw_job_title' => null,
            'status' => 'generalized',
            'preference_order' => 1,
        ]);
    }

    public function test_step_three_rejects_a_preference_with_id_and_custom_title(): void
    {
        $seeker = $this->createSeeker();
        $occupation = $this->createOccupation('5249', 'Sales Assistant');
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'local',
            'preferred_locations_details' => ['Urdaneta City, Pangasinan'],
            'occupation_preferences' => [[
                'occupation_id' => $occupation->id,
                'raw_job_title' => 'Online seller',
            ]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('occupation_preferences.0.raw_job_title');
    }

    public function test_step_three_deduplicates_preferred_countries_case_insensitively(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-3', [
            'work_type_preference' => 'full_time',
            'preferred_work_location' => 'overseas',
            'preferred_locations_details' => ['Japan', ' japan ', 'Canada'],
            'occupation_preferences' => [[
                'general_term' => 'healthcare work',
            ]],
        ])->assertOk();

        $seeker->refresh();
        $this->assertSame(['Japan', 'Canada'], $seeker->preferred_locations_details);
    }

    public function test_step_four_accepts_philippine_languages_and_normalizes_their_codes(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-4', [
            'languages' => [
                [
                    'language' => 'Cebuano',
                    'can_read' => true,
                    'can_write' => true,
                    'can_speak' => true,
                    'can_understand' => true,
                ],
                [
                    'language' => 'others',
                    'language_other' => '  Sambal  ',
                    'can_read' => false,
                    'can_write' => false,
                    'can_speak' => true,
                    'can_understand' => true,
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('seeker_languages', [
            'seeker_id' => $seeker->getKey(),
            'language' => 'cebuano',
            'language_other' => null,
            'can_speak' => true,
        ]);
        $this->assertDatabaseHas('seeker_languages', [
            'seeker_id' => $seeker->getKey(),
            'language' => 'others',
            'language_other' => 'Sambal',
            'can_speak' => true,
        ]);
    }

    public function test_step_four_requires_a_name_for_other_language(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-4', [
            'languages' => [[
                'language' => 'others',
                'language_other' => '   ',
                'can_speak' => true,
            ]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('languages');
    }

    public function test_step_five_deduplicates_hard_and_soft_skills_case_insensitively(): void
    {
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-5', [
            'currently_in_school' => false,
            'educations' => [[
                'level' => 'tertiary',
                'year_graduated' => 2025,
            ]],
            'technical_skills' => ['Microsoft Excel', ' microsoft excel ', 'Bookkeeping'],
            'soft_skills' => ['Teamwork', ' teamwork ', 'Communication'],
        ])->assertOk();

        $this->assertDatabaseCount('seeker_skills', 4);
        $this->assertDatabaseHas('seeker_skills', [
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Microsoft Excel',
            'skill_type' => 'technical',
        ]);
        $this->assertDatabaseHas('seeker_skills', [
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Teamwork',
            'skill_type' => 'soft',
        ]);
    }

    public function test_step_five_moves_known_skills_to_their_catalog_category(): void
    {
        DB::table('skill_catalog_entries')->upsert([
            [
                'name' => 'Programming',
                'normalized_name' => 'programming',
                'category' => 'technical',
                'source' => 'local_general',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Critical Thinking',
                'normalized_name' => 'critical thinking',
                'category' => 'soft',
                'source' => 'local_general',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ], ['category', 'normalized_name'], ['name', 'source', 'updated_at']);

        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/step-5', [
            'currently_in_school' => false,
            'educations' => [[
                'level' => 'tertiary',
                'year_graduated' => 2025,
            ]],
            'technical_skills' => ['Critical Thinking'],
            'soft_skills' => ['Programming'],
        ])->assertOk();

        $this->assertDatabaseHas('seeker_skills', [
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Programming',
            'skill_type' => 'technical',
        ]);
        $this->assertDatabaseHas('seeker_skills', [
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Critical Thinking',
            'skill_type' => 'soft',
        ]);
    }

    private function createSkillCatalogTable(): void
    {
        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category', 20);
                $table->string('source', 30);
                $table->string('element_id')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version', 20)->nullable();
                $table->timestamps();
                $table->unique(['category', 'normalized_name']);
            });
        }

        if (! Schema::hasTable('skill_aliases')) {
            Schema::create('skill_aliases', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('skill_id');
                $table->string('alias');
                $table->string('normalized_alias');
                $table->string('source')->default('local_reviewed');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }
    }

    public function test_seeker_can_upload_and_view_a_private_certificate(): void
    {
        Storage::fake('local');
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $response = $this->post('/api/seeker/certificates', [
            'title' => 'Computer Systems Servicing NC II',
            'issuing_body' => 'TESDA',
            'issued_at' => '2025-06-01',
            'certificate_file' => $this->fakePng('tesda-certificate.png'),
        ])
            ->assertCreated()
            ->assertJsonPath('certificate.title', 'Computer Systems Servicing NC II');

        $certificateId = $response->json('certificate.certificate_id');
        $certificate = SeekerCertificate::findOrFail($certificateId);

        Storage::disk('local')->assertExists($certificate->file_path);

        $this->get("/api/seeker/certificates/{$certificateId}/view")
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_seeker_cannot_view_another_seekers_certificate(): void
    {
        Storage::fake('local');
        $owner = $this->createSeeker();
        $otherSeeker = $this->createSeeker();
        $path = 'seeker_certificates/'.$owner->getKey().'/private.png';
        Storage::disk('local')->put($path, 'private certificate');

        $certificate = $owner->certificates()->create([
            'title' => 'Private Certificate',
            'issuing_body' => 'TESDA',
            'file_path' => $path,
            'original_filename' => 'private.png',
            'mime_type' => 'image/png',
            'file_size' => 19,
        ]);

        Sanctum::actingAs($otherSeeker);

        $this->get("/api/seeker/certificates/{$certificate->certificate_id}/view")
            ->assertNotFound();
    }

    public function test_profile_returns_nsrp_dashboard_metadata_and_certificates(): void
    {
        $seeker = $this->createSeeker();
        SeekerSkill::create([
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Data Entry',
            'skill_type' => 'dole_standard',
        ]);
        $seeker->certificates()->create([
            'title' => 'Digital Literacy',
            'issuing_body' => 'PESO',
            'file_path' => 'seeker_certificates/digital-literacy.pdf',
            'original_filename' => 'digital-literacy.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
        ]);

        Sanctum::actingAs($seeker);

        $this->getJson('/api/seeker/profile')
            ->assertOk()
            ->assertJsonPath('user.dashboard_stats.skills', 1)
            ->assertJsonPath('user.certificates.0.title', 'Digital Literacy')
            ->assertJsonPath('user.dole_skills.0', 'Data Entry')
            ->assertJsonStructure(['user' => ['profile_strength' => ['percentage', 'items']]]);
    }

    public function test_seeker_can_upload_and_view_a_private_square_profile_photo(): void
    {
        Storage::fake('local');
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->post('/api/seeker/profile-image', [
            'profile_image' => $this->fakeSquarePng('profile.png'),
        ])
            ->assertOk()
            ->assertJsonPath('profile_image_url', '/api/seeker/profile-image');

        $seeker->refresh();
        Storage::disk('local')->assertExists($seeker->profile_image);

        $this->get('/api/seeker/profile-image')
            ->assertOk()
            ->assertHeader('content-type', 'image/png');
    }

    public function test_resume_generation_requires_a_profile_photo(): void
    {
        Storage::fake('local');
        $seeker = $this->createSeeker();
        Sanctum::actingAs($seeker);

        $this->postJson('/api/seeker/resume/generate')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profile_image');
    }

    public function test_seeker_can_generate_a_resume_from_nsrp_data(): void
    {
        Storage::fake('local');
        $seeker = $this->createSeeker();
        SeekerEducation::create([
            'seeker_id' => $seeker->getKey(),
            'level' => 'tertiary',
            'course_strand' => 'Bachelor of Science in Information Technology',
            'year_graduated' => 2025,
        ]);
        SeekerSkill::create([
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Data Entry',
            'skill_type' => 'dole_standard',
        ]);
        SeekerWorkExperience::create([
            'seeker_id' => $seeker->getKey(),
            'company_name' => 'Urdaneta Service Center',
            'position' => 'Office Assistant',
            'number_of_months' => 6,
            'employment_status' => 'contractual',
        ]);

        Sanctum::actingAs($seeker);
        $this->post('/api/seeker/profile-image', [
            'profile_image' => $this->fakeSquarePng('resume-photo.png'),
        ])->assertOk();

        $response = $this->post('/api/seeker/resume/generate')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringContainsString('/BaseFont /Helvetica', $response->getContent());
        $this->assertStringNotContainsString('DejaVuSans', $response->getContent());
        Storage::disk('local')->assertExists("seeker_resumes/{$seeker->getKey()}/latest-resume.pdf");
        $this->assertDatabaseHas('job_seekers', [
            'seeker_id' => $seeker->getKey(),
            'resume_path' => "seeker_resumes/{$seeker->getKey()}/latest-resume.pdf",
        ]);
    }

    private function createSeeker(): JobSeeker
    {
        return JobSeeker::create([
            'first_name' => 'Maria',
            'last_name' => fake()->unique()->lastName(),
            'mobile_number' => '09123456789',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'date_of_birth' => '2000-01-15',
            'educ_attainment' => 'College Graduate',
            'address_barangay' => 'Poblacion',
            'address_municipality_city' => 'Urdaneta City',
            'address_province' => 'Pangasinan',
            'profile_completed' => true,
            'verification_status' => 'verified',
            'is_verified' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function createOccupation(string $code, string $title): Occupation
    {
        return Occupation::create([
            'psoc_code' => $code,
            'title' => $title,
            'version' => '2012',
            'source' => 'psa',
            'is_active' => true,
        ]);
    }

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
        );
    }

    private function fakeSquarePng(string $name): UploadedFile
    {
        $width = 300;
        $height = 300;
        $header = pack('NNC5', $width, $height, 8, 2, 0, 0, 0);
        $row = "\x00".str_repeat("\xF1\xF5\xF9", $width);
        $pixels = str_repeat($row, $height);
        $contents = "\x89PNG\r\n\x1a\n"
            .$this->pngChunk('IHDR', $header)
            .$this->pngChunk('IDAT', gzcompress($pixels, 9))
            .$this->pngChunk('IEND', '');

        return UploadedFile::fake()->createWithContent($name, $contents);
    }

    private function pngChunk(string $type, string $data): string
    {
        return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('administrators')) {
            Schema::create('administrators', function (Blueprint $table) {
                $table->id('admin_id');
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->unique();
                $table->string('mobile_number')->nullable();
                $table->string('password');
                $table->string('role')->default('admin');
                $table->string('status')->default('active');
                $table->timestamp('email_verified_at')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('search_terms')->nullable();
                $table->string('version')->default('2012');
                $table->string('source')->default('psa');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('first_name');
                $table->string('middle_name')->nullable();
                $table->string('last_name');
                $table->string('suffix')->nullable();
                $table->string('mobile_number');
                $table->string('email')->unique();
                $table->string('password');
                $table->date('date_of_birth')->nullable();
                $table->string('sex')->nullable();
                $table->string('civil_status')->nullable();
                $table->string('religion')->nullable();
                $table->decimal('height_ft', 4, 2)->nullable();
                $table->string('tin', 20)->nullable();
                $table->string('educ_attainment')->nullable();
                $table->string('address_house_street')->nullable();
                $table->string('address_barangay')->nullable();
                $table->string('address_municipality_city')->nullable();
                $table->string('address_province')->nullable();
                $table->string('address_province_code', 10)->nullable();
                $table->string('address_city_code', 10)->nullable();
                $table->string('address_barangay_code', 10)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->unsignedInteger('location_accuracy')->nullable();
                $table->string('google_place_id')->nullable();
                $table->string('employment_status')->nullable();
                $table->string('employment_type')->nullable();
                $table->string('self_employed_type')->nullable();
                $table->string('self_employed_type_others')->nullable();
                $table->unsignedInteger('unemployment_months')->nullable();
                $table->string('unemployment_reason')->nullable();
                $table->string('unemployment_reason_others')->nullable();
                $table->string('unemployment_terminated_country')->nullable();
                $table->boolean('is_ofw')->default(false);
                $table->string('ofw_country')->nullable();
                $table->boolean('is_former_ofw')->default(false);
                $table->string('former_ofw_country')->nullable();
                $table->date('former_ofw_return_date')->nullable();
                $table->boolean('is_4ps_beneficiary')->default(false);
                $table->string('household_id_4ps')->nullable();
                $table->string('work_type_preference')->nullable();
                $table->string('preferred_work_location')->nullable();
                $table->json('preferred_locations_details')->nullable();
                $table->boolean('currently_in_school')->default(false);
                $table->boolean('profile_completed')->default(false);
                $table->timestamp('profile_completed_at')->nullable();
                $table->json('form_validation_state')->nullable();
                $table->string('verification_status')->default('pending');
                $table->boolean('is_verified')->default(false);
                $table->string('profile_image')->nullable();
                $table->string('resume_path')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
            });
        }

        $this->createSimpleRelationTable('seeker_disabilities', function (Blueprint $table) {
            $table->string('disability_type')->nullable();
            $table->string('disability_specification')->nullable();
        });
        $this->createSimpleRelationTable('seeker_occupations', function (Blueprint $table) {
            $table->unsignedBigInteger('occupation_id')->nullable();
            $table->string('general_term')->nullable();
            $table->string('occupation_title');
            $table->string('raw_job_title')->nullable();
            $table->string('status')->default('standardized');
            $table->timestamp('mapped_at')->nullable();
            $table->unsignedTinyInteger('preference_order')->default(1);
        });
        $this->createSimpleRelationTable('seeker_work_locations', function (Blueprint $table) {
            $table->string('location_type');
            $table->string('location_name');
            $table->string('location_code')->nullable();
        });
        $this->createSimpleRelationTable('seeker_languages', function (Blueprint $table) {
            $table->string('language');
            $table->string('language_other')->nullable();
            $table->boolean('can_read')->default(false);
            $table->boolean('can_write')->default(false);
            $table->boolean('can_speak')->default(false);
            $table->boolean('can_understand')->default(false);
        });
        $this->createSimpleRelationTable('seeker_educations', function (Blueprint $table) {
            $table->string('level');
            $table->string('course_strand')->nullable();
            $table->unsignedSmallInteger('year_graduated')->nullable();
            $table->string('undergrad_level_reached')->nullable();
            $table->unsignedSmallInteger('undergrad_year_last_attended')->nullable();
        });
        $this->createSimpleRelationTable('seeker_trainings', function (Blueprint $table) {
            $table->string('course');
            $table->unsignedInteger('hours_of_training')->nullable();
            $table->string('training_institution')->nullable();
            $table->text('skills_acquired')->nullable();
            $table->string('certificates_received')->nullable();
        });
        $this->createSimpleRelationTable('seeker_eligibilities', function (Blueprint $table) {
            $table->string('type');
            $table->string('name');
            $table->date('date_taken')->nullable();
            $table->date('valid_until')->nullable();
        });
        $this->createSimpleRelationTable('seeker_work_experiences', function (Blueprint $table) {
            $table->string('company_name');
            $table->string('company_address')->nullable();
            $table->string('position');
            $table->unsignedInteger('number_of_months')->nullable();
            $table->string('employment_status')->nullable();
        });
        $this->createSimpleRelationTable('seeker_skills', function (Blueprint $table) {
            $table->unsignedBigInteger('skill_id')->nullable();
            $table->string('skill_name');
            $table->string('skill_type');
        });
        if (! Schema::hasColumn('seeker_skills', 'skill_id')) {
            Schema::table('seeker_skills', function (Blueprint $table) {
                $table->unsignedBigInteger('skill_id')->nullable();
            });
        }

        if (! Schema::hasTable('seeker_certificates')) {
            Schema::create('seeker_certificates', function (Blueprint $table) {
                $table->id('certificate_id');
                $table->unsignedBigInteger('seeker_id');
                $table->string('title');
                $table->string('issuing_body');
                $table->string('file_path');
                $table->string('original_filename');
                $table->string('mime_type');
                $table->unsignedBigInteger('file_size');
                $table->date('issued_at')->nullable();
                $table->timestamps();
            });
        }
    }

    private function createSimpleRelationTable(string $name, callable $columns): void
    {
        if (Schema::hasTable($name)) {
            return;
        }

        Schema::create($name, function (Blueprint $table) use ($columns) {
            $table->id();
            $table->unsignedBigInteger('seeker_id');
            $columns($table);
            $table->timestamps();
        });
    }
}
