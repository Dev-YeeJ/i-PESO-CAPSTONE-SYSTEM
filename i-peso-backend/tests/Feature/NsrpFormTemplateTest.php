<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use App\Models\SeekerDisability;
use App\Models\SeekerEducation;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use App\Models\SeekerTraining;
use App\Models\SeekerWorkExperience;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * The NSRP Form 1 PDF template (panel revision #15). Rendered to HTML with an
 * in-memory seeker, so it checks what the form prints without a database.
 */
class NsrpFormTemplateTest extends TestCase
{
    public function test_a_profile_that_fits_prints_on_the_two_official_pages_only(): void
    {
        $html = $this->render($this->seeker());

        $this->assertStringContainsString('Page 1 of 2', $html);
        $this->assertStringContainsString('Page 2 of 2', $html);
        $this->assertStringNotContainsString('Extra sheet', $html);
        $this->assertStringContainsString('i-PESO Jobseeker ID 000042', $html);
        $this->assertStringContainsString('by Maria Santos', $html);
    }

    public function test_each_other_language_gets_its_own_row_and_checkboxes(): void
    {
        $seeker = $this->seeker(languages: [
            $this->language('english', read: true),
            $this->language('pangasinan', read: true, speak: true),
            $this->language('ilocano', understand: true),
        ]);

        $html = $this->compact($this->render($seeker));

        // Pangasinan: read + speak; Ilocano: understand only — no longer sharing one row's boxes.
        $this->assertMatchesRegularExpression('/Others: <span class="line">Pangasinan<\/span><\/td>(<td class="center"><span class="box">X<\/span><\/td>)(<td class="center"><span class="box"><\/span><\/td>)(<td class="center"><span class="box">X<\/span><\/td>)(<td class="center"><span class="box"><\/span><\/td>)/', $html);
        $this->assertMatchesRegularExpression('/Others: <span class="line">Ilocano<\/span><\/td>(<td class="center"><span class="box"><\/span><\/td>){3}<td class="center"><span class="box">X<\/span><\/td>/', $html);
    }

    public function test_education_saved_under_the_old_level_names_still_prints(): void
    {
        $seeker = $this->seeker(educations: [
            $this->education('graduate', 'Master in Public Administration', 2021),
            $this->education('senior_high', 'STEM', 2015),
        ]);

        $html = $this->render($seeker);

        $this->assertStringContainsString('Master in Public Administration', $html);
        $this->assertStringContainsString('STEM', $html);
    }

    public function test_section_viii_reads_skills_from_both_places_they_are_stored(): void
    {
        $seeker = $this->seeker(otherSkills: ['driver', 'others', 'Welding']);

        $html = $this->compact($this->render($seeker, ['dole_standard' => ['Masonry'], 'technical' => [], 'soft' => []]));

        $this->assertStringContainsString('<span class="box">X</span> DRIVER', $html);
        $this->assertStringContainsString('<span class="box">X</span> MASONRY', $html);
        $this->assertStringContainsString('<span class="box"></span> PLUMBING', $html);
        $this->assertStringContainsString('OTHERS: <span class="line">Welding</span>', $html);
    }

    public function test_entries_that_do_not_fit_continue_on_an_extra_sheet_instead_of_being_dropped(): void
    {
        $seeker = $this->seeker(
            occupations: collect(range(1, 4))->map(fn ($i) => $this->occupation("Occupation {$i}", $i))->all(),
            trainings: collect(range(1, 4))->map(fn ($i) => $this->training("Training {$i}"))->all(),
            experiences: [
                $this->experience('Old Co.', '2010-01-01', '2012-01-01'),
                $this->experience('Third Co.', '2019-01-01', '2020-01-01'),
                $this->experience('Current Co.', '2023-01-01', null, current: true),
                $this->experience('Second Co.', '2021-01-01', '2022-12-01'),
                $this->experience('Fourth Co.', '2017-01-01', '2018-06-01'),
            ],
        );

        $html = $this->render($seeker, ['dole_standard' => [], 'technical' => ['Laravel'], 'soft' => ['Teamwork']]);

        $this->assertStringContainsString('Page 3 of 3', $html);
        $this->assertStringContainsString('Extra sheet', $html);
        $this->assertStringContainsString('4. Occupation 4', $html);
        $this->assertStringContainsString('4. Training 4', $html);
        $this->assertStringContainsString('Laravel, Teamwork', $html);

        // Section VII: most recent first; the 4th recent job continues, the one over 10 years ago is set apart.
        $this->assertTrue(strpos($html, 'Current Co.') < strpos($html, 'Second Co.'));
        $this->assertTrue(strpos($html, 'Second Co.') < strpos($html, 'Third Co.'));
        $this->assertTrue(strpos($html, 'Third Co.') < strpos($html, 'Fourth Co.'));
        $this->assertTrue(strpos($html, 'Earlier work experience') < strpos($html, 'Old Co.'));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function render(JobSeeker $seeker, array $skillsByType = ['dole_standard' => [], 'technical' => [], 'soft' => []]): string
    {
        return view('pdf.nsrp-form', [
            'seeker' => $seeker,
            'skillsByType' => $skillsByType,
            'generatedDate' => Carbon::parse('2026-11-14 10:00:00', 'Asia/Manila'),
            'generatedBy' => 'Maria Santos',
        ])->render();
    }

    /** Collapses whitespace between tags so table rows can be matched as one line. */
    private function compact(string $html): string
    {
        return preg_replace('/>\s+</', '><', preg_replace('/\s+/', ' ', $html));
    }

    private function seeker(array $languages = [], array $educations = [], array $occupations = [], array $trainings = [], array $experiences = [], array $otherSkills = []): JobSeeker
    {
        $seeker = new JobSeeker();
        $seeker->forceFill([
            'seeker_id' => 42, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male',
            'civil_status' => 'single', 'employment_status' => 'unemployed', 'preferred_work_location' => 'local',
            'other_skills' => $otherSkills,
        ]);

        foreach ([
            'disabilities' => [new SeekerDisability()],
            'languages' => $languages,
            'educations' => $educations,
            'occupations' => $occupations,
            'trainings' => $trainings,
            'workExperiences' => $experiences,
            'eligibilities' => [],
            'workLocations' => [],
        ] as $relation => $items) {
            $seeker->setRelation($relation, collect($relation === 'disabilities' ? [] : $items));
        }

        return $seeker;
    }

    private function language(string $name, bool $read = false, bool $speak = false, bool $understand = false): SeekerLanguage
    {
        return (new SeekerLanguage())->forceFill(['language' => $name, 'can_read' => $read, 'can_write' => false, 'can_speak' => $speak, 'can_understand' => $understand]);
    }

    private function education(string $level, string $course, int $year): SeekerEducation
    {
        return (new SeekerEducation())->forceFill(['level' => $level, 'course_strand' => $course, 'year_graduated' => $year]);
    }

    private function occupation(string $title, int $order): SeekerOccupation
    {
        return (new SeekerOccupation())->forceFill(['occupation_title' => $title, 'preference_order' => $order]);
    }

    private function training(string $course): SeekerTraining
    {
        return (new SeekerTraining())->forceFill(['course' => $course, 'hours_of_training' => 40]);
    }

    private function experience(string $company, string $start, ?string $end, bool $current = false): SeekerWorkExperience
    {
        return (new SeekerWorkExperience())->forceFill([
            'company_name' => $company, 'position' => 'Staff', 'start_date' => $start, 'end_date' => $end,
            'currently_employed' => $current, 'number_of_months' => 12, 'employment_status' => 'contractual',
        ]);
    }
}
