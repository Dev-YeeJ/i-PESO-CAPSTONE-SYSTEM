<?php

namespace Tests\Unit;

use App\Models\GovernmentProgram;
use App\Models\JobSeeker;
use App\Services\EligibilityMatchingService;
use Tests\TestCase;

class EligibilityMatchingServiceTest extends TestCase
{
    private EligibilityMatchingService $svc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->svc = new EligibilityMatchingService();
    }

    /** SPES-style program: age 15-30 (required), unemployed (required), >= HS grad, 4Ps. */
    private function spesProgram(): GovernmentProgram
    {
        return new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 30, 'label' => 'Age 15-30', 'weight' => 2, 'required' => true],
            ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Currently unemployed', 'weight' => 2, 'required' => true],
            ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'High School Graduate', 'label' => 'At least HS graduate', 'weight' => 1],
            ['field' => 'is_4ps_beneficiary', 'op' => 'equals', 'value' => true, 'label' => '4Ps household', 'weight' => 1],
        ]]);
    }

    public function test_a_fully_matching_seeker_is_highly_eligible(): void
    {
        $seeker = new JobSeeker([
            'date_of_birth' => now()->subYears(22)->toDateString(),
            'employment_status' => 'unemployed',
            'educ_attainment' => 'High School Graduate',
            'is_4ps_beneficiary' => true,
        ]);

        $result = $this->svc->evaluate($seeker, $this->spesProgram());

        $this->assertSame(100, $result['score']);
        $this->assertSame('highly_eligible', $result['status']);
        $this->assertCount(4, $result['breakdown']);
        $this->assertTrue(collect($result['breakdown'])->every(fn ($r) => $r['met']));
    }

    public function test_a_failed_required_rule_forces_not_eligible_regardless_of_score(): void
    {
        // Meets 3 of 4 rules (educ + 4Ps + one required) but is employed => required fail.
        $seeker = new JobSeeker([
            'date_of_birth' => now()->subYears(22)->toDateString(),
            'employment_status' => 'employed',
            'educ_attainment' => 'College Graduate',
            'is_4ps_beneficiary' => true,
        ]);

        $result = $this->svc->evaluate($seeker, $this->spesProgram());

        $this->assertSame('not_eligible', $result['status']);
        $this->assertSame('Not Eligible', $result['label']);
    }

    public function test_a_seeker_missing_only_optional_rules_is_partially_eligible(): void
    {
        // Three of four known criteria pass; criteria contribute equally.
        $seeker = new JobSeeker([
            'date_of_birth' => now()->subYears(20)->toDateString(),
            'employment_status' => 'unemployed',
            'educ_attainment' => 'High School Graduate',
            'is_4ps_beneficiary' => false,
            'profile_completed' => true,
        ]);

        $result = $this->svc->evaluate($seeker, $this->spesProgram());

        $this->assertSame('partially_eligible', $result['status']);
        $this->assertSame(75, $result['score']);
    }

    public function test_missing_profile_data_is_unknown_not_a_failed_eligibility_rule(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 30, 'label' => 'Age 15-30', 'weight' => 2, 'required' => true],
            ['field' => 'employment_status', 'op' => 'in', 'values' => ['unemployed'], 'label' => 'Unemployed', 'weight' => 1],
        ]]);
        $seeker = new JobSeeker(['employment_status' => 'unemployed']);

        $result = $this->svc->evaluate($seeker, $program);

        $this->assertSame('profile_incomplete', $result['status']);
        $this->assertSame('Update your profile to check eligibility', $result['label']);
        $this->assertSame(100, $result['score']);
        $this->assertSame(50, $result['coverage']);
        $this->assertFalse($result['breakdown'][0]['known']);
        $this->assertFalse($result['breakdown'][0]['met']);
    }

    public function test_no_known_criteria_does_not_show_a_zero_or_full_match_score(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'age', 'op' => 'between', 'min' => 15, 'max' => 30, 'label' => 'Age 15-30', 'weight' => 1, 'required' => true],
        ]]);
        $seeker = new JobSeeker();

        $result = $this->svc->evaluate($seeker, $program);

        $this->assertSame('profile_incomplete', $result['status']);
        $this->assertNull($result['score']);
        $this->assertSame(0, $result['coverage']);
    }

    public function test_education_min_level_uses_human_readable_ranking(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'educ_attainment', 'op' => 'min_level', 'value' => 'College Graduate', 'label' => 'College grad', 'weight' => 1],
        ]]);

        $undergrad = new JobSeeker(['educ_attainment' => 'College Undergraduate']);
        $grad = new JobSeeker(['educ_attainment' => 'College Graduate']);
        $masters = new JobSeeker(['educ_attainment' => "Master's Degree"]);

        $this->assertSame('low_match', $this->svc->evaluate($undergrad, $program)['status']);
        $this->assertSame('highly_eligible', $this->svc->evaluate($grad, $program)['status']);
        $this->assertSame('highly_eligible', $this->svc->evaluate($masters, $program)['status']);
    }

    public function test_civil_status_rules_match_profile_values_case_insensitively(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'civil_status', 'op' => 'in', 'values' => ['single'], 'label' => 'Single', 'weight' => 1],
        ]]);
        $seeker = new JobSeeker(['civil_status' => 'Single']);

        $this->assertSame('highly_eligible', $this->svc->evaluate($seeker, $program)['status']);
    }

    public function test_ofw_rule_matches_former_ofw_too(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => [
            ['field' => 'is_ofw', 'op' => 'equals', 'value' => true, 'label' => 'OFW / former OFW', 'weight' => 1, 'required' => true],
        ]]);

        $formerOfw = new JobSeeker(['is_ofw' => false, 'is_former_ofw' => true]);
        $notOfw = new JobSeeker(['is_ofw' => false, 'is_former_ofw' => false, 'profile_completed' => true]);

        $this->assertSame('highly_eligible', $this->svc->evaluate($formerOfw, $program)['status']);
        $this->assertSame('not_eligible', $this->svc->evaluate($notOfw, $program)['status']);
    }

    public function test_a_program_with_no_rules_is_open_to_everyone(): void
    {
        $program = new GovernmentProgram(['eligibility_rules' => []]);
        $seeker = new JobSeeker(['date_of_birth' => now()->subYears(40)->toDateString()]);

        $result = $this->svc->evaluate($seeker, $program);

        $this->assertSame('eligible', $result['status']);
        $this->assertSame(100, $result['score']);
        $this->assertSame([], $result['breakdown']);
    }

    public function test_a_null_seeker_yields_unknown_status(): void
    {
        $result = $this->svc->evaluate(null, $this->spesProgram());

        $this->assertSame('unknown', $result['status']);
    }
}
