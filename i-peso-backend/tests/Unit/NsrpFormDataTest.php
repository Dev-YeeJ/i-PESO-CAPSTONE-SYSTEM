<?php

namespace Tests\Unit;

use App\Models\JobSeeker;
use App\Models\SeekerDisability;
use App\Models\SeekerEducation;
use App\Models\SeekerLanguage;
use App\Models\SeekerSkill;
use App\Models\SeekerWorkExperience;
use App\Support\Nsrp\NsrpFormData;
use Tests\TestCase;

/**
 * How a job seeker's profile is mapped onto NSRP Form 1. Models are built in memory with their
 * relations set directly, so these run without a database.
 */
class NsrpFormDataTest extends TestCase
{
    public function test_work_experience_is_listed_most_recent_first_and_cut_to_three_rows(): void
    {
        $seeker = $this->seeker(workExperiences: [
            ['id' => 1, 'company_name' => 'Oldest', 'start_date' => '2015-01-01', 'end_date' => '2016-01-01'],
            ['id' => 2, 'company_name' => 'Current', 'start_date' => '2023-01-01', 'end_date' => null, 'currently_employed' => true],
            ['id' => 3, 'company_name' => 'Recent', 'start_date' => '2020-01-01', 'end_date' => '2022-06-01', 'employment_status' => 'part_time'],
            ['id' => 4, 'company_name' => 'Middle', 'start_date' => '2017-01-01', 'end_date' => '2019-01-01'],
        ]);

        $work = NsrpFormData::for($seeker)['work'];

        $this->assertSame(['Current', 'Recent', 'Middle'], array_column($work, 'company'));
        $this->assertSame('Part-Time', $work[1]['status']);
    }

    public function test_an_unanswered_yes_no_question_ticks_neither_box(): void
    {
        $form = NsrpFormData::for($this->seeker(['is_ofw' => null, 'is_former_ofw' => false, 'is_4ps_beneficiary' => true]));

        $this->assertNull($form['ofw']['is_ofw']);
        $this->assertFalse($form['ofw']['is_former']);
        $this->assertTrue($form['four_ps']['beneficiary']);
    }

    public function test_missing_values_print_blank_rather_than_placeholders(): void
    {
        $form = NsrpFormData::for($this->seeker(['middle_name' => null, 'religion' => null, 'tin' => null, 'height_ft' => null]));

        $this->assertSame('', $form['name']['middle']);
        $this->assertSame('', $form['religion']);
        $this->assertSame('', $form['tin']);
        $this->assertSame('', $form['height']);
        $this->assertSame([null, null, null], $form['work']);
    }

    public function test_education_accepts_current_and_older_level_names(): void
    {
        $seeker = $this->seeker(educations: [
            ['level' => 'secondary_k12', 'year_graduated' => 2014],
            ['level' => 'senior_high', 'course_strand' => 'STEM', 'year_graduated' => 2016],
            ['level' => 'graduate', 'course_strand' => 'Master in Public Administration', 'undergrad_level_reached' => '1st Year'],
        ]);

        $education = NsrpFormData::for($seeker)['education'];

        $this->assertTrue($education['secondary']['k12']);
        $this->assertFalse($education['secondary']['non_k12']);
        $this->assertSame('STEM', $education['secondary']['strand']);
        $this->assertSame('2016', $education['secondary']['year_graduated']); // senior high finishes K-12
        $this->assertSame('Master in Public Administration', $education['graduate']['course']);
        $this->assertSame('1st Year', $education['graduate']['level_reached']);
        $this->assertFalse($education['tertiary']['present']);
    }

    public function test_skills_tick_the_official_boxes_and_write_the_rest_under_others(): void
    {
        $seeker = $this->seeker(['other_skills' => ['plumbing', 'others']], skills: [
            ['skill_name' => 'Computer Literate', 'skill_type' => 'dole_standard'],
            ['skill_name' => 'painter / artist', 'skill_type' => 'dole_standard'],
            ['skill_name' => 'Baking', 'skill_type' => 'dole_standard'],
            ['skill_name' => 'Python', 'skill_type' => 'technical'], // not a section VIII skill
        ]);

        $skills = NsrpFormData::for($seeker)['skills'];

        $this->assertSame(['Computer Literate', 'Painter/Artist', 'Plumbing'], array_keys($skills['checked']));
        $this->assertSame('Baking', $skills['others']);
    }

    public function test_every_other_language_shares_the_others_row(): void
    {
        $seeker = $this->seeker(languages: [
            ['language' => 'english', 'can_read' => true, 'can_write' => true],
            ['language' => 'others', 'language_other' => 'Pangasinan', 'can_speak' => true],
            ['language' => 'japanese', 'can_understand' => true],
        ]);

        $languages = NsrpFormData::for($seeker)['languages'];

        $this->assertTrue($languages['english']['read']);
        $this->assertFalse($languages['english']['speak']);
        $this->assertFalse($languages['mandarin']['read']);
        $this->assertSame('Pangasinan, Japanese', $languages['others']['name']);
        $this->assertTrue($languages['others']['speak']);
        $this->assertTrue($languages['others']['understand']);
        $this->assertFalse($languages['others']['read']);
    }

    public function test_preferred_places_are_written_under_the_chosen_kind_of_location(): void
    {
        $form = NsrpFormData::for($this->seeker([
            'preferred_work_location' => 'overseas',
            'preferred_locations_details' => ['Japan', 'Canada'],
        ]));

        $this->assertSame(['Japan', 'Canada', ''], $form['preference']['overseas']);
        $this->assertSame(['', '', ''], $form['preference']['local']);
    }

    public function test_the_filename_is_nsrp_jobseeker_lastname_firstname(): void
    {
        $this->assertSame('NSRP_Jobseeker_Dela_Cruz_Villanueva_Jose_Maria.pdf', NsrpFormData::filename($this->seeker(['last_name' => 'Dela Cruz-Villanueva', 'first_name' => 'José María'])));
        $this->assertSame('NSRP_Jobseeker_Pena_Nino.pdf', NsrpFormData::filename($this->seeker(['last_name' => 'Peña', 'first_name' => 'Niño'])));
    }

    public function test_the_please_specify_blank_labels_a_physical_description(): void
    {
        $onlyOther = NsrpFormData::for($this->seeker(disabilities: [
            ['disability_type' => 'others', 'disability_specification' => 'Autism'],
        ]))['disability'];
        $this->assertSame('Autism', $onlyOther['specify']); // reads exactly as before

        $both = NsrpFormData::for($this->seeker(disabilities: [
            ['disability_type' => 'physical', 'disability_specification' => 'Left leg amputation'],
            ['disability_type' => 'others', 'disability_specification' => 'Autism'],
        ]))['disability'];
        $this->assertSame(['physical', 'others'], $both['types']);
        $this->assertSame('Physical: Left leg amputation; Others: Autism', $both['specify']);

        $physicalOnly = NsrpFormData::for($this->seeker(disabilities: [
            ['disability_type' => 'physical', 'disability_specification' => 'Uses a wheelchair'],
        ]))['disability'];
        $this->assertSame('Physical: Uses a wheelchair', $physicalOnly['specify']);

        // Both at their 255-character maximum: cut so it still fits the space on paper.
        $longest = NsrpFormData::for($this->seeker(disabilities: [
            ['disability_type' => 'physical', 'disability_specification' => str_repeat('a', 255)],
            ['disability_type' => 'others', 'disability_specification' => str_repeat('b', 255)],
        ]))['disability'];
        $this->assertLessThanOrEqual(121, mb_strlen($longest['specify']));
        $this->assertStringEndsWith('…', $longest['specify']);

        $noDetails = NsrpFormData::for($this->seeker(disabilities: [
            ['disability_type' => 'physical', 'disability_specification' => null],
        ]))['disability'];
        $this->assertSame('', $noDetails['specify']);
    }

    public function test_a_long_specify_answer_moves_above_the_short_blank_and_stays_in_its_cell(): void
    {
        $render = fn (array $disabilities) => view('pdf.nsrp-form', ['form' => NsrpFormData::for($this->seeker(disabilities: $disabilities))])->render();

        // Short: written on the blank itself (x 351pt = blank start + 1.5).
        $short = $render([['disability_type' => 'others', 'disability_specification' => 'Autism']]);
        $this->assertMatchesRegularExpression('/left:351pt;[^"]*">Autism<\/div>/', $short);

        // Long: in the empty part of the disability cell above the blank (x 284.5pt, 116pt wide,
        // so it ends before the divider at 404.4pt), wrapped instead of shrunk to nothing.
        $long = $render([['disability_type' => 'physical', 'disability_specification' => 'Left leg amputation below the knee, uses crutches']]);
        $this->assertMatchesRegularExpression(
            '/left:284\.5pt;[^"]*width:116pt;[^"]*">Physical: Left leg amputation below the knee, uses crutches<\/div>/',
            $long,
        );
        preg_match('/font-size:([\d.]+)pt;[^"]*">Physical: Left leg/', $long, $size);
        $this->assertGreaterThanOrEqual(4.2, (float) $size[1]);
    }

    public function test_the_form_renders_the_official_wording_and_both_page_numbers(): void
    {
        $html = view('pdf.nsrp-form', ['form' => NsrpFormData::for($this->seeker(['civil_status' => 'separated']))])->render();

        foreach ([
            'NATIONAL SKILLS REGISTRATION PROGRAM',
            'JOBSEEKER REGISTRATION FORM',
            'I.PERSONAL INFORMATION',
            'EMPLOYMENT STATUS / TYPE',
            'II. JOB PREFERENCE',
            'III. LANGUAGE / DIALECT PROFICIENCY',
            'IV. EDUCATIONAL BACKGROUND',
            'V. TECHNICAL/VOCATIONAL AND OTHER TRAINING',
            'VI. ELIGIBILITY/ PROFESSIONAL LICENSE',
            'VII. WORK EXPERIENCE',
            'VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE',
            'are true to the best of my knowledge',
            'FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.',
            'Signature over Printed Name of Assessor',
        ] as $text) {
            $this->assertStringContainsString($text, $html);
        }
        $this->assertStringContainsString('Page <span class="b">1</span> of <span class="b">2</span>', $html);
        $this->assertStringContainsString('Page <span class="b">2</span> of <span class="b">2</span>', $html);
        // "Separated" is not one of the form's three boxes; it is written in instead.
        $this->assertStringContainsString('>Separated</div>', $html);
    }

    private function seeker(array $attributes = [], array $workExperiences = [], array $educations = [], array $skills = [], array $languages = [], array $disabilities = []): JobSeeker
    {
        $seeker = (new JobSeeker)->forceFill($attributes + [
            'seeker_id' => 7,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
        ]);

        $seeker->setRelation('workExperiences', collect($workExperiences)->map(fn ($row) => (new SeekerWorkExperience)->forceFill($row)));
        $seeker->setRelation('educations', collect($educations)->map(fn ($row) => (new SeekerEducation)->forceFill($row)));
        $seeker->setRelation('seekerSkills', collect($skills)->map(fn ($row) => (new SeekerSkill)->forceFill($row)));
        $seeker->setRelation('languages', collect($languages)->map(fn ($row) => (new SeekerLanguage)->forceFill($row)));
        $seeker->setRelation('disabilities', collect($disabilities)->map(fn ($row) => (new SeekerDisability)->forceFill($row)));
        foreach (['occupations', 'workLocations', 'trainings', 'eligibilities'] as $relation) {
            $seeker->setRelation($relation, collect());
        }

        return $seeker;
    }
}
