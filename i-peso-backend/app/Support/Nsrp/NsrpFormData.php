<?php

namespace App\Support\Nsrp;

use App\Models\JobSeeker;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Maps one job seeker's saved profile onto the fields of DOLE's NSRP Form 1 (September 2020),
 * the Jobseeker Registration Form. The PDF view (resources/views/pdf/nsrp-form.blade.php) only
 * draws the form and prints these values; every mapping decision lives here.
 *
 * Rules:
 *  - Only the selected seeker's own records are used (the controller eager-loads them).
 *  - Nothing is invented: a value the seeker never gave prints blank, and a Yes/No question
 *    they never answered has neither box ticked (rather than defaulting to "No").
 *  - Lists are cut to the rows the paper form has (3 occupations, 3 trainings, 2 eligibilities,
 *    2 licenses, 3 jobs), most relevant first.
 */
final class NsrpFormData
{
    public const RELATIONS = [
        'disabilities',
        'occupations',
        'languages',
        'workLocations',
        'educations',
        'seekerSkills',
        'trainings',
        'eligibilities',
        'workExperiences',
    ];

    /** Section VIII, in the form's own column order. */
    public const STANDARD_SKILLS = [
        ['Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate', 'Domestic Chores', 'Driver'],
        ['Electrician', 'Embroidery', 'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs'],
        ['Photography', 'Plumbing', 'Sewing Dresses', 'Stenography', 'Tailoring'],
    ];

    public static function for(JobSeeker $seeker): array
    {
        $seeker->loadMissing(self::RELATIONS);

        return [
            'name' => [
                'surname' => self::upper($seeker->last_name),
                'first' => self::upper($seeker->first_name),
                'middle' => self::upper($seeker->middle_name),
                'suffix' => self::upper($seeker->suffix),
            ],
            'date_of_birth' => self::date($seeker->date_of_birth, 'm/d/Y'),
            'sex' => $seeker->sex,
            'religion' => filled($seeker->religion) ? $seeker->getFormattedReligion() : '',
            'civil_status' => $seeker->civil_status,
            'address' => [
                'street' => self::text($seeker->address_house_street),
                'barangay' => self::text($seeker->address_barangay),
                'city' => self::text($seeker->address_municipality_city),
                'province' => self::text($seeker->address_province),
            ],
            'tin' => self::text($seeker->tin),
            'height' => self::height($seeker->height_ft),
            'contact' => self::text($seeker->mobile_number),
            'email' => self::text($seeker->email),
            'disability' => self::disabilities($seeker),
            'employment' => [
                'status' => $seeker->employment_status,
                'type' => $seeker->employment_type,
                'self_employed_type' => $seeker->self_employed_type,
                'self_employed_other' => self::text($seeker->self_employed_type_others),
                'months_looking' => $seeker->unemployment_months !== null ? (string) $seeker->unemployment_months : '',
                'reason' => $seeker->unemployment_reason,
                'reason_other' => self::text($seeker->unemployment_reason_others),
                'terminated_country' => self::text($seeker->unemployment_terminated_country),
            ],
            'ofw' => [
                'is_ofw' => self::yesNo($seeker->is_ofw),
                'country' => self::text($seeker->ofw_country),
                'is_former' => self::yesNo($seeker->is_former_ofw),
                'former_country' => self::text($seeker->former_ofw_country),
                'return_month_year' => self::date($seeker->former_ofw_return_date, 'm/Y'),
            ],
            'four_ps' => [
                'beneficiary' => self::yesNo($seeker->is_4ps_beneficiary),
                'household_id' => self::text($seeker->household_id_4ps),
            ],
            'preference' => self::preferences($seeker),
            'languages' => self::languages($seeker),
            'currently_in_school' => self::yesNo($seeker->currently_in_school),
            'education' => self::education($seeker),
            'trainings' => self::rows($seeker->trainings->sortBy('id')->take(3), fn ($t) => [
                'course' => self::text($t->course),
                'hours' => $t->hours_of_training !== null ? (string) $t->hours_of_training : '',
                'institution' => self::text($t->training_institution),
                'skills' => self::text($t->skills_acquired),
                'certificates' => self::text($t->certificates_received),
            ], 3),
            'eligibilities' => self::rows($seeker->eligibilities->where('type', 'civil_service')->sortBy('id')->take(2), fn ($e) => [
                'name' => self::text($e->name),
                'date_taken' => self::date($e->date_taken, 'm/d/Y'),
            ], 2),
            'licenses' => self::rows($seeker->eligibilities->where('type', 'professional_license')->sortBy('id')->take(2), fn ($e) => [
                'name' => self::text($e->name),
                'valid_until' => self::date($e->valid_until, 'm/d/Y'),
            ], 2),
            'work' => self::rows(self::mostRecentFirst($seeker->workExperiences)->take(3), fn ($w) => [
                'company' => self::text($w->company_name),
                'address' => self::text($w->company_address),
                'position' => self::text($w->position),
                'months' => $w->number_of_months !== null ? (string) $w->number_of_months : '',
                'status' => filled($w->employment_status) ? Str::of($w->employment_status)->replace('_', '-')->title()->toString() : '',
            ], 3),
            'skills' => self::skills($seeker),
        ];
    }

    /** NSRP_Jobseeker_LastName_FirstName.pdf, safe for every browser and file system. */
    public static function filename(JobSeeker $seeker): string
    {
        $part = static fn (?string $value) => trim((string) preg_replace('/[^A-Za-z0-9]+/', '_', Str::ascii((string) $value)), '_');
        $name = implode('_', array_filter([$part($seeker->last_name), $part($seeker->first_name)]));

        return 'NSRP_Jobseeker_'.($name !== '' ? $name : $seeker->getKey()).'.pdf';
    }

    private static function disabilities(JobSeeker $seeker): array
    {
        $types = $seeker->disabilities->pluck('disability_type')->map(fn ($t) => strtolower((string) $t));
        $detail = fn (string $type) => self::text(optional($seeker->disabilities->firstWhere('disability_type', $type))->disability_specification);
        $physical = $detail('physical');
        $other = $detail('others');

        // The form has one "Please specify" blank. With only an Others description it reads as
        // before; once a physical description is involved each part is labelled so the reader
        // can tell them apart.
        $specify = $physical === ''
            ? $other
            : implode('; ', array_filter(['Physical: '.$physical, $other !== '' ? 'Others: '.$other : null]));
        // The space on paper holds about 120 characters at the smallest legible size;
        // anything longer is cut on the printed copy (staff see the full text in i-PESO).
        $specify = Str::limit($specify, 120, '…');

        return [
            'types' => $types->reject(fn ($t) => $t === 'none')->values()->all(),
            'other' => $other,
            'physical' => $physical,
            'specify' => $specify,
        ];
    }

    private static function preferences(JobSeeker $seeker): array
    {
        $local = collect();
        $overseas = collect();

        // Current profiles keep the chosen places in preferred_locations_details, all of one kind
        // (preferred_work_location). Older ones have typed rows in seeker_work_locations.
        $details = collect($seeker->preferred_locations_details ?? [])->map(fn ($v) => self::text($v))->filter()->values();
        if ($details->isNotEmpty()) {
            if ($seeker->preferred_work_location === 'overseas') {
                $overseas = $details;
            } else {
                $local = $details;
            }
        } else {
            $local = $seeker->workLocations->where('location_type', 'local')->pluck('location_name')->map(fn ($v) => self::text($v))->filter()->values();
            $overseas = $seeker->workLocations->where('location_type', 'overseas')->pluck('location_name')->map(fn ($v) => self::text($v))->filter()->values();
        }

        return [
            'work_type' => $seeker->work_type_preference,
            'location_kind' => $seeker->preferred_work_location,
            'occupations' => self::pad($seeker->occupations->sortBy('preference_order')
                ->map(fn ($o) => self::text($o->occupation_title ?: $o->raw_job_title))->filter()->values()->take(3), 3),
            'local' => self::pad($local->take(3), 3),
            'overseas' => self::pad($overseas->take(3), 3),
        ];
    }

    private static function languages(JobSeeker $seeker): array
    {
        $rows = [];
        foreach (['english', 'filipino', 'mandarin'] as $key) {
            $rows[$key] = self::abilities($seeker->languages->where('language', $key));
        }

        // Every other language (Pangasinan, Ilocano, Japanese…) shares the form's single "Others" row:
        // all of their names are written in, and an ability is ticked when any of them has it.
        $others = $seeker->languages->reject(fn ($l) => in_array($l->language, ['english', 'filipino', 'mandarin'], true));
        $rows['others'] = self::abilities($others) + [
            'name' => $others->map(fn ($l) => $l->language === 'others' ? self::text($l->language_other) : Str::title((string) $l->language))
                ->filter()->unique()->implode(', '),
        ];

        return $rows;
    }

    private static function abilities(Collection $languages): array
    {
        return [
            'read' => $languages->contains(fn ($l) => (bool) $l->can_read),
            'write' => $languages->contains(fn ($l) => (bool) $l->can_write),
            'speak' => $languages->contains(fn ($l) => (bool) $l->can_speak),
            'understand' => $languages->contains(fn ($l) => (bool) $l->can_understand),
        ];
    }

    private static function education(JobSeeker $seeker): array
    {
        // Levels as saved by onboarding; the older short names are still accepted.
        $level = static fn (string ...$names) => $seeker->educations->first(fn ($e) => in_array($e->level, $names, true));
        $row = static fn ($e) => [
            'present' => $e !== null,
            'course' => self::text(optional($e)->course_strand),
            'year_graduated' => self::text(optional($e)->year_graduated),
            'level_reached' => self::text(optional($e)->undergrad_level_reached),
            'year_last_attended' => self::text(optional($e)->undergrad_year_last_attended),
        ];

        $nonK12 = $level('secondary_non_k12');
        $k12 = $level('secondary_k12');
        $seniorHigh = $level('senior_high_strand', 'senior_high');
        // The form has one Secondary row: the old curriculum's high school, or K-12 — where the
        // senior high record carries the strand and the final year.
        $secondary = $nonK12 ?? $seniorHigh ?? $k12;

        return [
            'elementary' => $row($level('elementary')),
            'secondary' => $row($secondary) + [
                'non_k12' => $nonK12 !== null,
                'k12' => $k12 !== null || $seniorHigh !== null,
                'strand' => self::text(optional($seniorHigh)->course_strand ?: ($nonK12 === null ? optional($k12)->course_strand : null)),
            ],
            'tertiary' => $row($level('tertiary')),
            'graduate' => $row($level('graduate_studies', 'graduate')),
        ];
    }

    /** Most recent first: a current job, then the latest end date, then the latest start date. */
    private static function mostRecentFirst(Collection $experiences): Collection
    {
        return $experiences->sortBy([
            fn ($a, $b) => (int) (bool) $b->currently_employed <=> (int) (bool) $a->currently_employed,
            fn ($a, $b) => (string) $b->end_date <=> (string) $a->end_date,
            fn ($a, $b) => (string) $b->start_date <=> (string) $a->start_date,
            fn ($a, $b) => $b->id <=> $a->id,
        ])->values();
    }

    private static function skills(JobSeeker $seeker): array
    {
        $names = $seeker->seekerSkills->where('skill_type', 'dole_standard')->pluck('skill_name')
            ->merge(collect($seeker->other_skills ?? [])) // older profiles stored them here
            ->map(fn ($v) => self::text($v))
            ->filter(fn ($v) => $v !== '' && strtolower($v) !== 'others');

        $key = static fn (string $v) => preg_replace('/[^a-z]/', '', strtolower($v));
        $standard = collect(self::STANDARD_SKILLS)->flatten()->mapWithKeys(fn ($label) => [$key($label) => $label]);

        $checked = [];
        $others = [];
        foreach ($names as $name) {
            $match = $standard->get($key($name));
            if ($match !== null) {
                $checked[$match] = true;
            } else {
                $others[strtolower($name)] = $name;
            }
        }

        return ['checked' => $checked, 'others' => implode(', ', $others)];
    }

    private static function rows(Collection $items, callable $map, int $count): array
    {
        return self::pad($items->values()->map($map), $count, null);
    }

    private static function pad(Collection $items, int $count, $filler = ''): array
    {
        return array_pad($items->values()->all(), $count, $filler);
    }

    private static function yesNo($value): ?bool
    {
        return $value === null ? null : (bool) $value;
    }

    private static function height($feet): string
    {
        if (! is_numeric($feet) || (float) $feet <= 0) {
            return '';
        }
        $inches = (int) round((float) $feet * 12);

        return intdiv($inches, 12)."' ".($inches % 12).'"';
    }

    private static function date($value, string $format): string
    {
        if (blank($value)) {
            return '';
        }
        try {
            return Carbon::parse($value)->format($format);
        } catch (\Throwable) {
            return self::text($value);
        }
    }

    private static function upper($value): string
    {
        return mb_strtoupper(self::text($value));
    }

    private static function text($value): string
    {
        return is_scalar($value) ? trim(preg_replace('/\s+/u', ' ', (string) $value)) : '';
    }
}
