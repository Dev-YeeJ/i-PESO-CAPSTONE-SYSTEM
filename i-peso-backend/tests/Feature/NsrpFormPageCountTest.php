<?php

namespace Tests\Feature;

use App\Models\JobSeeker;
use App\Models\SeekerLanguage;
use App\Models\SeekerOccupation;
use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

/**
 * The NSRP Form 1 must stay on its two official legal-size pages (plus one
 * extra sheet only when needed) — an extra row that overflowed page 1 would
 * push the whole printed form out of shape.
 */
class NsrpFormPageCountTest extends TestCase
{
    public function test_a_full_page_one_still_fits_on_two_pages(): void
    {
        $seeker = $this->seeker([
            $this->language('english'), $this->language('filipino'), $this->language('pangasinan'), $this->language('ilocano'),
        ], 3);

        $this->assertSame(2, $this->pageCount($seeker));
    }

    public function test_overflow_adds_exactly_one_extra_sheet(): void
    {
        $seeker = $this->seeker([
            $this->language('english'), $this->language('pangasinan'), $this->language('ilocano'), $this->language('cebuano'),
        ], 6);

        $this->assertSame(3, $this->pageCount($seeker));
    }

    private function pageCount(JobSeeker $seeker): int
    {
        $pdf = Pdf::loadView('pdf.nsrp-form', [
            'seeker' => $seeker,
            'skillsByType' => ['dole_standard' => [], 'technical' => [], 'soft' => []],
            'generatedDate' => now(),
            'generatedBy' => 'Maria Santos',
        ])->setPaper('legal', 'portrait')->output();

        return preg_match_all('/\/Type\s*\/Page[^s]/', $pdf);
    }

    private function seeker(array $languages, int $occupationCount): JobSeeker
    {
        $seeker = (new JobSeeker())->forceFill([
            'seeker_id' => 7, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male',
            'civil_status' => 'single', 'employment_status' => 'unemployed', 'preferred_work_location' => 'local',
            'address_house_street' => '12 Rizal St.', 'address_barangay' => 'Poblacion',
            'address_municipality_city' => 'Urdaneta City', 'address_province' => 'Pangasinan',
        ]);

        $occupations = collect(range(1, $occupationCount))
            ->map(fn ($i) => (new SeekerOccupation())->forceFill(['occupation_title' => "Occupation {$i}", 'preference_order' => $i]));

        foreach (['disabilities' => [], 'languages' => $languages, 'educations' => [], 'occupations' => $occupations->all(),
            'trainings' => [], 'workExperiences' => [], 'eligibilities' => [], 'workLocations' => []] as $relation => $items) {
            $seeker->setRelation($relation, collect($items));
        }

        return $seeker;
    }

    private function language(string $name): SeekerLanguage
    {
        return (new SeekerLanguage())->forceFill(['language' => $name, 'can_read' => true, 'can_write' => true, 'can_speak' => true, 'can_understand' => true]);
    }
}
