<?php

namespace Tests\Feature;

use App\Models\Employer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployerRegistrationStep3Test extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('employers')) {
            Schema::create('employers', function (Blueprint $table) {
                $table->id('employer_id');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('company_type')->nullable();
                $table->string('company_name')->nullable();
                $table->string('tin')->nullable();
                $table->string('trade_name')->nullable();
                $table->string('industry')->nullable();
                $table->string('industry_type')->nullable();
                $table->string('company_size')->nullable();
                $table->string('province')->nullable();
                $table->string('province_code')->nullable();
                $table->string('region_code')->nullable();
                $table->string('city_municipality')->nullable();
                $table->string('city_code')->nullable();
                $table->string('barangay')->nullable();
                $table->string('barangay_code')->nullable();
                $table->string('house_unit_street')->nullable();
                $table->string('complete_address')->nullable();
                $table->string('full_address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->unsignedInteger('location_accuracy')->nullable();
                $table->string('google_place_id')->nullable();
                $table->timestamp('location_verified_at')->nullable();
                $table->text('company_description')->nullable();
                $table->string('company_logo')->nullable();
                $table->string('verification_status')->default('pending');
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('employer_documents')) {
            Schema::create('employer_documents', function (Blueprint $table) {
                $table->id('document_id');
                $table->unsignedBigInteger('employer_id');
                $table->string('document_type');
                $table->string('document_path')->nullable();
                $table->string('original_filename')->nullable();
                $table->integer('file_size')->nullable();
                $table->string('mime_type')->nullable();
                $table->timestamp('uploaded_at')->nullable();
                $table->string('verification_status')->default('pending');
                $table->text('admin_notes')->nullable();
                $table->timestamp('viewed_at')->nullable();
                $table->date('expiration_date')->nullable();
                $table->timestamps();
            });
        }
    }

    public function test_verified_employer_can_save_company_profile(): void
    {
        $employer = Employer::create([
            'email' => 'step3-test@example.com',
            'password' => 'password123',
            'company_type' => 'sole_proprietorship',
            'email_verified_at' => now(),
            'verification_status' => 'pending',
        ]);

        Sanctum::actingAs($employer);

        $response = $this->post('/api/employer/register/step-2', [
            'company_name' => 'Step Three Test Company',
            'tin' => '123-456-789-000',
            'trade_name' => 'Step Three',
            'industry' => ['Information Technology'],
            'company_size' => 'micro',
            'province' => 'Pangasinan',
            'province_code' => '015500000',
            'city_municipality' => 'Urdaneta City',
            'city_code' => '015546000',
            'barangay' => 'Poblacion',
            'barangay_code' => '015546015',
            'house_unit_street' => '123 Test Street',
            'latitude' => 15.9758,
            'longitude' => 120.5707,
            'location_accuracy' => 25,
            'google_place_id' => 'test-place-id',
            'company_description' => 'A test company profile for employer onboarding.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('company_name', 'Step Three Test Company');

        $this->assertDatabaseHas('employers', [
            'employer_id' => $employer->employer_id,
            'company_name' => 'Step Three Test Company',
            'tin' => '123-456-789-000',
            'company_size' => 'micro',
            'province_code' => '015500000',
            'city_code' => '015546000',
            'barangay_code' => '015546015',
            'latitude' => 15.9758,
            'longitude' => 120.5707,
            'location_accuracy' => 25,
            'google_place_id' => 'test-place-id',
        ]);
    }

    /**
     * The affidavit of undertaking and no-pending-case certificate used to
     * be optional outside the two recruitment-agency types. They're now
     * required for every company type, with nothing left optional.
     */
    public function test_affidavit_and_no_pending_case_certificate_are_required_for_every_company_type(): void
    {
        foreach ([
            'sole_proprietorship',
            'corporation_partnership',
            'local_recruitment_agency',
            'overseas_recruitment_agency',
            'government_agency',
        ] as $companyType) {
            $employer = Employer::create([
                'email' => "required-docs-{$companyType}@example.com",
                'password' => 'password123',
                'company_type' => $companyType,
                'email_verified_at' => now(),
                'verification_status' => 'pending',
            ]);

            Sanctum::actingAs($employer);

            $response = $this->getJson('/api/employer/required-documents');

            $response->assertOk();
            $required = $response->json('required_documents');
            $this->assertContains('affidavit_of_undertaking', $required, "affidavit_of_undertaking should be required for {$companyType}");
            $this->assertContains('no_pending_case_certificate', $required, "no_pending_case_certificate should be required for {$companyType}");
            $this->assertSame([], $response->json('optional_documents'), "no document should be optional for {$companyType}");
            $this->assertSame(array_unique($required), array_values($required), "required_documents should not contain duplicates for {$companyType}");
        }
    }
}
