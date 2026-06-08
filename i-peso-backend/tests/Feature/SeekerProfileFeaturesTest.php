<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use App\Models\SeekerCertificate;
use App\Models\SeekerEducation;
use App\Models\SeekerSkill;
use App\Models\SeekerWorkExperience;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
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
                $table->string('educ_attainment')->nullable();
                $table->string('address_house_street')->nullable();
                $table->string('address_barangay')->nullable();
                $table->string('address_municipality_city')->nullable();
                $table->string('address_province')->nullable();
                $table->string('work_type_preference')->nullable();
                $table->string('preferred_work_location')->nullable();
                $table->json('preferred_locations_details')->nullable();
                $table->boolean('currently_in_school')->default(false);
                $table->boolean('profile_completed')->default(false);
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
            $table->string('occupation_title');
            $table->unsignedTinyInteger('preference_order')->default(1);
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
            $table->string('skill_name');
            $table->string('skill_type');
        });

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
