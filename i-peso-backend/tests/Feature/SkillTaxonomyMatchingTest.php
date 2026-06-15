<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use App\Models\JobVacancy;
use App\Models\JobVacancyCertification;
use App\Models\Occupation;
use App\Models\SeekerEducation;
use App\Models\SeekerEligibility;
use App\Models\SeekerOccupation;
use App\Models\SeekerSkill;
use App\Models\SeekerWorkExperience;
use App\Models\Skill;
use App\Models\SkillRelationship;
use App\Services\JobMatchingService;
use App\Services\JobSkillMatchingService;
use App\Services\SkillTaxonomyService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SkillTaxonomyMatchingTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTables();
    }

    public function test_related_operational_tools_produce_a_weighted_match(): void
    {
        $graphicDesign = $this->skill('Graphic Design', 'technical');
        $photoshop = $this->skill('Adobe Photoshop', 'technical');
        $teamwork = $this->skill('Teamwork', 'soft');

        SkillRelationship::query()->create([
            'parent_skill_id' => $graphicDesign->id,
            'related_skill_id' => $photoshop->id,
            'relationship_type' => 'operational_tool',
            'match_weight' => 0.85,
            'reverse_match_weight' => 0.65,
            'source' => 'onet_reviewed',
        ]);

        $seeker = $this->seeker();
        SeekerSkill::query()->create([
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Adobe Photoshop',
            'skill_type' => 'technical',
        ]);
        SeekerSkill::query()->create([
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Teamwork',
            'skill_type' => 'soft',
        ]);

        $vacancy = $this->vacancy(
            requiredSkills: ['Graphic Design'],
            softSkills: ['Teamwork']
        );

        $taxonomy = app(SkillTaxonomyService::class);
        $taxonomy->syncSeeker($seeker);
        $taxonomy->syncVacancy($vacancy);

        $score = app(JobSkillMatchingService::class)->score($vacancy, $seeker);

        $this->assertSame(90.0, $score['percentage']);
        $this->assertSame(2, $score['matched_requirements']);
        $this->assertSame('operational_tool', $score['details'][0]['match_type']);
        $this->assertSame('exact_or_alias', $score['details'][1]['match_type']);
        $this->assertTrue(
            JobVacancy::query()
                ->matchWithSynonyms($seeker)
                ->whereKey($vacancy->getKey())
                ->exists()
        );
    }

    public function test_reverse_relationship_is_partial_not_exact(): void
    {
        $graphicDesign = $this->skill('Graphic Design', 'technical');
        $photoshop = $this->skill('Adobe Photoshop', 'technical');

        SkillRelationship::query()->create([
            'parent_skill_id' => $graphicDesign->id,
            'related_skill_id' => $photoshop->id,
            'relationship_type' => 'operational_tool',
            'match_weight' => 0.85,
            'reverse_match_weight' => 0.65,
            'source' => 'onet_reviewed',
        ]);

        $seeker = $this->seeker();
        SeekerSkill::query()->create([
            'seeker_id' => $seeker->getKey(),
            'skill_name' => 'Graphic Design',
            'skill_type' => 'technical',
        ]);
        $vacancy = $this->vacancy(requiredSkills: ['Adobe Photoshop']);

        $taxonomy = app(SkillTaxonomyService::class);
        $taxonomy->syncSeeker($seeker);
        $taxonomy->syncVacancy($vacancy);

        $score = app(JobSkillMatchingService::class)->score($vacancy, $seeker);

        $this->assertSame(65.0, $score['percentage']);
        $this->assertSame('reverse_operational_tool', $score['details'][0]['match_type']);
    }

    public function test_aliases_resolve_to_the_canonical_skill(): void
    {
        $skill = $this->skill('Basic Computer Operations', 'technical');
        $skill->aliases()->create([
            'alias' => 'Computer Literate',
            'normalized_alias' => 'computer literate',
            'source' => 'local_general',
        ]);

        $resolved = app(SkillTaxonomyService::class)->resolve(
            'computer literate',
            'technical',
            create: false
        );

        $this->assertSame($skill->id, $resolved?->id);
    }

    public function test_composite_match_scores_occupation_skills_experience_and_education(): void
    {
        $occupation = Occupation::query()->create([
            'psoc_code' => '2512',
            'classification_code' => '2512',
            'isco_group' => '2512',
            'title' => 'Software Developer',
            'source' => 'psa',
            'is_active' => true,
        ]);
        $webDevelopment = $this->skill('Web Development', 'technical');
        $php = $this->skill('PHP', 'technical');

        SkillRelationship::query()->create([
            'parent_skill_id' => $webDevelopment->id,
            'related_skill_id' => $php->id,
            'relationship_type' => 'operational_tool',
            'match_weight' => 0.85,
            'reverse_match_weight' => 0.65,
            'source' => 'onet_reviewed',
        ]);

        $seeker = $this->seeker();
        SeekerOccupation::query()->create([
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => $occupation->id,
            'occupation_title' => $occupation->title,
            'status' => 'standardized',
            'preference_order' => 1,
        ]);
        SeekerSkill::query()->create([
            'seeker_id' => $seeker->getKey(),
            'skill_id' => $php->id,
            'skill_name' => 'PHP',
            'skill_type' => 'technical',
        ]);
        SeekerWorkExperience::query()->create([
            'seeker_id' => $seeker->getKey(),
            'occupation_id' => $occupation->id,
            'company_name' => 'Example Company',
            'position' => 'Software Developer',
            'normalized_position' => 'software developer',
            'number_of_months' => 12,
        ]);
        SeekerEducation::query()->create([
            'seeker_id' => $seeker->getKey(),
            'level' => 'tertiary',
            'course_strand' => 'BS Information Technology',
            'normalized_course_strand' => 'bs information technology',
            'year_graduated' => 2025,
        ]);

        $vacancy = JobVacancy::query()->create([
            'occupation_id' => $occupation->id,
            'job_title' => $occupation->title,
            'required_skills' => ['Web Development'],
            'soft_skills' => [],
            'minimum_education' => 'College Graduate',
            'target_courses' => ['BS Information Technology'],
            'experience_level' => '1-3 Years',
            'minimum_experience_months' => 12,
            'required_certifications' => [],
            'certifications_mandatory' => false,
            'status' => 'active',
        ]);
        app(SkillTaxonomyService::class)->syncVacancy($vacancy);

        $match = app(JobMatchingService::class)->score($vacancy, $seeker);

        $this->assertSame(94.0, $match['percentage']);
        $this->assertTrue($match['eligible']);
        $this->assertSame('high', $match['confidence']);
        $this->assertSame(100.0, $match['factors']['occupation']['score']);
        $this->assertSame(85.0, $match['factors']['skills']['score']);
        $this->assertSame(100.0, $match['factors']['experience']['score']);
        $this->assertSame(100.0, $match['factors']['education']['score']);
    }

    public function test_missing_mandatory_certification_marks_match_ineligible(): void
    {
        $seeker = $this->seeker();
        $vacancy = $this->vacancy(requiredSkills: ['Graphic Design']);

        JobVacancyCertification::query()->create([
            'post_id' => $vacancy->getKey(),
            'name' => 'TESDA Visual Graphic Design NC III',
            'normalized_name' => 'tesda visual graphic design nc iii',
            'is_mandatory' => true,
        ]);

        $match = app(JobMatchingService::class)->score($vacancy, $seeker);

        $this->assertFalse($match['eligible']);
        $this->assertStringContainsString(
            'TESDA Visual Graphic Design NC III',
            $match['eligibility_reasons'][0]
        );

        SeekerEligibility::query()->create([
            'seeker_id' => $seeker->getKey(),
            'type' => 'professional_license',
            'name' => 'TESDA Visual Graphic Design NC III',
            'normalized_name' => 'tesda visual graphic design nc iii',
        ]);
        $vacancy->unsetRelation('certificationRequirements');
        $seeker->unsetRelation('eligibilities');

        $this->assertTrue(
            app(JobMatchingService::class)->score($vacancy, $seeker)['eligible']
        );
    }

    private function skill(string $name, string $category): Skill
    {
        return Skill::query()->create([
            'name' => $name,
            'normalized_name' => app(SkillTaxonomyService::class)->normalize($name),
            'category' => $category,
            'source' => 'test',
        ]);
    }

    private function seeker(): JobSeeker
    {
        $id = (int) DB::table('job_seekers')->insertGetId([
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
            'created_at' => now(),
            'updated_at' => now(),
        ], 'seeker_id');

        return JobSeeker::query()->findOrFail($id);
    }

    private function vacancy(array $requiredSkills, array $softSkills = []): JobVacancy
    {
        return JobVacancy::query()->create([
            'job_title' => 'Test Vacancy',
            'required_skills' => $requiredSkills,
            'soft_skills' => $softSkills,
            'status' => 'active',
        ]);
    }

    private function createTables(): void
    {
        if (! Schema::hasTable('skill_catalog_entries')) {
            Schema::create('skill_catalog_entries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('normalized_name');
                $table->text('search_terms')->nullable();
                $table->string('category');
                $table->string('source');
                $table->string('element_id')->nullable();
                $table->unsignedInteger('occupation_count')->default(0);
                $table->boolean('is_hot')->default(false);
                $table->boolean('is_in_demand')->default(false);
                $table->string('version')->nullable();
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
                $table->string('source');
                $table->decimal('confidence', 4, 3)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('skill_relationships')) {
            Schema::create('skill_relationships', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('parent_skill_id');
                $table->unsignedBigInteger('related_skill_id');
                $table->string('relationship_type');
                $table->decimal('match_weight', 4, 3);
                $table->decimal('reverse_match_weight', 4, 3);
                $table->string('source');
                $table->string('external_code')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_seekers')) {
            Schema::create('job_seekers', function (Blueprint $table) {
                $table->id('seeker_id');
                $table->string('email');
                $table->string('password');
                $table->string('work_type_preference')->nullable();
                $table->json('preferred_work_setups')->nullable();
                $table->json('preferred_employment_types')->nullable();
                $table->json('preferred_locations_details')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('occupations')) {
            Schema::create('occupations', function (Blueprint $table) {
                $table->id();
                $table->string('psoc_code')->unique();
                $table->string('classification_code')->nullable();
                $table->string('isco_group')->nullable();
                $table->string('title');
                $table->string('source');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_occupations')) {
            Schema::create('seeker_occupations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('general_term')->nullable();
                $table->string('occupation_title');
                $table->string('status')->default('standardized');
                $table->unsignedTinyInteger('preference_order')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_educations')) {
            Schema::create('seeker_educations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->string('level');
                $table->string('course_strand')->nullable();
                $table->string('normalized_course_strand')->nullable();
                $table->unsignedSmallInteger('year_graduated')->nullable();
                $table->string('undergrad_level_reached')->nullable();
                $table->unsignedSmallInteger('undergrad_year_last_attended')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_work_experiences')) {
            Schema::create('seeker_work_experiences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->string('company_name');
                $table->string('company_address')->nullable();
                $table->string('position');
                $table->string('normalized_position')->nullable();
                $table->unsignedInteger('number_of_months')->nullable();
                $table->string('employment_status')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_trainings')) {
            Schema::create('seeker_trainings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->string('course');
                $table->string('normalized_course')->nullable();
                $table->string('certificates_received')->nullable();
                $table->string('normalized_certificates')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_eligibilities')) {
            Schema::create('seeker_eligibilities', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->string('type');
                $table->string('name');
                $table->string('normalized_name')->nullable();
                $table->date('date_taken')->nullable();
                $table->date('valid_until')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('seeker_skills')) {
            Schema::create('seeker_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('seeker_id');
                $table->unsignedBigInteger('skill_id')->nullable();
                $table->string('skill_name');
                $table->string('skill_type');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancies')) {
            Schema::create('job_vacancies', function (Blueprint $table) {
                $table->id('post_id');
                $table->string('job_title');
                $table->unsignedBigInteger('occupation_id')->nullable();
                $table->json('required_skills')->nullable();
                $table->json('soft_skills')->nullable();
                $table->string('minimum_education')->nullable();
                $table->json('target_courses')->nullable();
                $table->string('experience_level')->nullable();
                $table->unsignedSmallInteger('minimum_experience_months')->default(0);
                $table->json('required_certifications')->nullable();
                $table->boolean('certifications_mandatory')->default(false);
                $table->date('application_deadline')->nullable();
                $table->string('employment_type')->nullable();
                $table->string('work_setup')->nullable();
                $table->string('province')->nullable();
                $table->string('city_municipality')->nullable();
                $table->string('barangay')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('job_vacancy_skills')) {
            Schema::create('job_vacancy_skills', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id');
                $table->unsignedBigInteger('skill_id');
                $table->string('skill_type');
                $table->string('original_name');
                $table->decimal('weight', 5, 2);
                $table->timestamps();
                $table->unique(['post_id', 'skill_id', 'skill_type']);
            });
        }

        if (! Schema::hasTable('job_vacancy_certifications')) {
            Schema::create('job_vacancy_certifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id');
                $table->string('name');
                $table->string('normalized_name');
                $table->boolean('is_mandatory')->default(false);
                $table->timestamps();
            });
        }
    }
}
