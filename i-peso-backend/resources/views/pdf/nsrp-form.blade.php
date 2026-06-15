<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NSRP Form 1 - {{ $seeker->last_name }}, {{ $seeker->first_name }}</title>
    <style>
        @page {
            size: legal portrait;
            margin: 16pt 20pt 18pt;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #000;
            background: #fff;
        font-family: "DejaVu Sans", Arial, sans-serif;
            font-size: 8pt;
            line-height: 1.18;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        td,
        th {
            border: 0.7pt solid #000;
            padding: 2.3pt 3.5pt;
            vertical-align: middle;
        }

        th {
            font-weight: 700;
            text-align: center;
        }

        .page {
            width: 100%;
        }

        .page-break {
            page-break-after: always;
        }

        .form-code {
            font-size: 9.2pt;
            font-weight: 700;
            line-height: 1.45;
            text-align: center;
        }

        .agency-header {
            font-size: 9.2pt;
            font-weight: 700;
            line-height: 1.22;
            text-align: center;
        }

        .program-title {
            font-size: 10.2pt;
        }

        .instructions {
            font-size: 7.4pt;
            font-weight: 600;
            line-height: 1.22;
            text-align: justify;
        }

        .section {
            height: 18pt;
            padding: 2pt 4pt;
            font-size: 8.8pt;
            font-weight: 800;
            text-transform: uppercase;
        }

        .subsection {
            font-size: 7.8pt;
            font-weight: 800;
            text-transform: uppercase;
        }

        .label {
            font-weight: 700;
        }

        .value {
            min-height: 13pt;
            font-size: 7.8pt;
            font-weight: 600;
        }

        .center {
            text-align: center;
        }

        .right {
            text-align: right;
        }

        .top {
            vertical-align: top;
        }

        .box {
            display: inline-block;
            width: 9pt;
            height: 9pt;
            margin: 0 2pt 0 1pt;
            border: 0.8pt solid #000;
            font-size: 7pt;
            font-weight: 900;
            line-height: 8pt;
            text-align: center;
            vertical-align: -1.2pt;
        }

        .choice {
            display: inline-block;
            margin-right: 8pt;
            white-space: nowrap;
        }

        .line {
            display: inline-block;
            min-width: 65pt;
            min-height: 8pt;
            padding: 0 2pt 1pt;
            border-bottom: 0.7pt solid #000;
            font-weight: 600;
        }

        .name-value {
            height: 34pt;
            padding-top: 11pt;
            font-size: 8.8pt;
            font-weight: 700;
            text-align: center;
            vertical-align: bottom;
        }

        .name-label {
            padding: 1.5pt 2pt;
            font-size: 6.8pt;
            font-weight: 700;
            text-align: center;
        }

        .compact td,
        .compact th {
            padding: 1.5pt 2.5pt;
        }

        .tight td,
        .tight th {
            padding: 1pt 2pt;
        }

        .row-12 {
            height: 18pt;
        }

        .row-14 {
            height: 20pt;
        }

        .row-15 {
            height: 20pt;
        }

        .row-16 {
            height: 22pt;
        }

        .row-17 {
            height: 27pt;
        }

        .row-18 {
            height: 28pt;
        }

        .row-19 {
            height: 24pt;
        }

        .row-21 {
            height: 28pt;
        }

        .row-24 {
            height: 30pt;
        }

        .row-28 {
            height: 35pt;
        }

        .row-34 {
            height: 40pt;
        }

        .row-42 {
            height: 54pt;
        }

        .row-55 {
            height: 75pt;
        }

        .row-74 {
            height: 88pt;
        }

        .row-92 {
            height: 115pt;
        }

        .no-top {
            border-top: 0;
        }

        .no-bottom {
            border-bottom: 0;
        }

        .no-border {
            border: 0;
        }

        .number {
            width: 23pt;
            text-align: center;
        }

        .small {
            font-size: 6.8pt;
        }

        .tiny {
            font-size: 6pt;
        }

        .page-number {
            margin-top: 7pt;
            font-size: 7.5pt;
            font-weight: 700;
            text-align: right;
        }

        .signature-line {
            display: inline-block;
            width: 145pt;
            height: 22pt;
            border-bottom: 0.7pt solid #000;
        }

        .certification {
            font-size: 7.2pt;
            line-height: 1.25;
            text-align: justify;
        }

        .dotted {
            border-top: 1pt dashed #000;
        }
    </style>
</head>
<body>
@php
    $text = static fn ($value, $fallback = 'N/A') => filled($value) ? (string) $value : $fallback;
    $checked = static fn ($condition) => $condition ? 'X' : '';
    $enum = static fn ($value) => filled($value)
        ? ucwords(str_replace('_', ' ', (string) $value))
        : 'N/A';
    $date = static fn ($value, $format = 'm/d/Y') => $value
        ? \Illuminate\Support\Carbon::parse($value)->format($format)
        : 'N/A';

    $disabilityTypes = $seeker->disabilities
        ->pluck('disability_type')
        ->map(static fn ($type) => strtolower((string) $type))
        ->all();
    $otherDisability = optional(
        $seeker->disabilities->firstWhere('disability_type', 'others')
    )->disability_specification;

    $occupations = $seeker->occupations->take(3)->values();
    $preferredLocations = collect($seeker->preferred_locations_details ?? [])
        ->filter()
        ->take(3)
        ->values();
    if ($preferredLocations->isEmpty()) {
        $preferredLocations = $seeker->workLocations
            ->pluck('location_name')
            ->filter()
            ->take(3)
            ->values();
    }

    $languageRecords = $seeker->languages->mapWithKeys(function ($language) {
        $name = strtolower($language->language === 'others'
            ? ($language->language_other ?: 'others')
            : $language->language);

        return [$name => $language];
    });
    $namedLanguageKeys = ['english', 'filipino', 'mandarin'];
    $otherLanguages = $languageRecords->reject(
        static fn ($language, $key) => in_array($key, $namedLanguageKeys, true)
    );
    $otherLanguageNames = $otherLanguages->keys()
        ->map(static fn ($name) => ucwords($name))
        ->implode(', ');
    $otherLanguage = $otherLanguages->first();

    $educationByLevel = $seeker->educations->keyBy('level');
    $trainings = $seeker->trainings->take(3)->values();
    $civilEligibilities = $seeker->eligibilities
        ->where('type', 'civil_service')
        ->take(2)
        ->values();
    $professionalLicenses = $seeker->eligibilities
        ->where('type', 'professional_license')
        ->take(2)
        ->values();
    $workExperiences = $seeker->workExperiences->take(3)->values();

    $standardSkills = collect($skillsByType['dole_standard'] ?? [])
        ->map(static fn ($skill) => strtolower(trim((string) $skill)))
        ->all();
    $standardSkillLabels = [
        'auto_mechanic' => 'Auto Mechanic',
        'beautician' => 'Beautician',
        'carpentry_work' => 'Carpentry Work',
        'computer_literate' => 'Computer Literate',
        'domestic_chores' => 'Domestic Chores',
        'driver' => 'Driver',
        'electrician' => 'Electrician',
        'embroidery' => 'Embroidery',
        'gardening' => 'Gardening',
        'masonry' => 'Masonry',
        'painter_artist' => 'Painter/Artist',
        'painting_jobs' => 'Painting Jobs',
        'photography' => 'Photography',
        'plumbing' => 'Plumbing',
        'sewing_dresses' => 'Sewing Dresses',
        'stenography' => 'Stenography',
        'tailoring' => 'Tailoring',
    ];
    $hasStandardSkill = static function (string $key) use ($standardSkills, $standardSkillLabels): bool {
        $candidates = [
            strtolower($key),
            strtolower(str_replace('_', ' ', $key)),
            strtolower($standardSkillLabels[$key] ?? $key),
        ];

        return count(array_intersect($candidates, $standardSkills)) > 0;
    };
    $knownSkillValues = collect(array_keys($standardSkillLabels))
        ->flatMap(static fn ($key) => [
            strtolower($key),
            strtolower(str_replace('_', ' ', $key)),
            strtolower($standardSkillLabels[$key]),
        ])
        ->unique()
        ->all();
    $otherStandardSkills = collect($skillsByType['dole_standard'] ?? [])
        ->reject(static fn ($skill) => in_array(strtolower(trim((string) $skill)), $knownSkillValues, true))
        ->implode(', ');

    $heightInches = filled($seeker->height_ft)
        ? (int) round(((float) $seeker->height_ft) * 12)
        : null;
    $heightDisplay = $heightInches
        ? intdiv($heightInches, 12)."' ".($heightInches % 12).'"'
        : 'N/A';
@endphp

<div class="page page-break">
    <table class="tight">
        <tr>
            <td style="width: 15%;" class="form-code">
                NSRP Form 1<br>
                September<br>
                2020
            </td>
            <td class="agency-header">
                Republic of the Philippines<br>
                Department of Labor and Employment<br>
                <span class="program-title">NATIONAL SKILLS REGISTRATION PROGRAM</span><br>
                <span class="program-title">JOBSEEKER REGISTRATION FORM</span>
            </td>
        </tr>
        <tr>
            <td colspan="2" class="instructions">
                <strong>INSTRUCTIONS:</strong> Please fill out the form legibly in block letters using a ballpoint pen.
                Check appropriate boxes. Please do not leave any items unanswered. Indicate "N/A" if not applicable.
                You may use extra sheet if needed. Submit accomplished form to the Public Employment Service Office
                (PESO) Manager or Officer in your city/municipality.
            </td>
        </tr>
    </table>

    <table class="tight">
        <tr><td colspan="12" class="section">I. PERSONAL INFORMATION</td></tr>
        <tr>
            <td colspan="3" class="name-value">{{ strtoupper($text($seeker->last_name)) }}</td>
            <td colspan="3" class="name-value">{{ strtoupper($text($seeker->first_name)) }}</td>
            <td colspan="3" class="name-value">{{ strtoupper($text($seeker->middle_name)) }}</td>
            <td colspan="3" class="name-value">{{ strtoupper($text($seeker->suffix)) }}</td>
        </tr>
        <tr>
            <td colspan="3" class="name-label">SURNAME</td>
            <td colspan="3" class="name-label">FIRST NAME</td>
            <td colspan="3" class="name-label">MIDDLE NAME</td>
            <td colspan="3" class="name-label">SUFFIX (Ex: Sr., Jr., III, etc.)</td>
        </tr>
        <tr class="row-14">
            <td colspan="5"><span class="label">DATE OF BIRTH (mm/dd/yyyy)</span>&nbsp; {{ $date($seeker->date_of_birth) }}</td>
            <td colspan="7"></td>
        </tr>
        <tr>
            <td colspan="4" class="row-16">
                <span class="label">SEX</span>&nbsp;&nbsp;
                <span class="choice"><span class="box">{{ $checked($seeker->sex === 'male') }}</span>Male</span>
                <span class="choice"><span class="box">{{ $checked($seeker->sex === 'female') }}</span>Female</span>
            </td>
            <td colspan="8" rowspan="5" class="top" style="padding: 0;">
                <table class="tight">
                    <tr><td colspan="4" class="subsection">PRESENT ADDRESS</td></tr>
                    <tr class="row-14">
                        <td style="width: 31%;" class="label">House No./Street Village</td>
                        <td colspan="3">{{ $text($seeker->address_house_street) }}</td>
                    </tr>
                    <tr class="row-14">
                        <td class="label">Barangay</td>
                        <td colspan="3">{{ $text($seeker->address_barangay) }}</td>
                    </tr>
                    <tr class="row-14">
                        <td class="label">Municipality/City</td>
                        <td colspan="3">{{ $text($seeker->address_municipality_city) }}</td>
                    </tr>
                    <tr class="row-14">
                        <td class="label">Province</td>
                        <td colspan="3">{{ $text($seeker->address_province) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr class="row-16">
            <td colspan="4"><span class="label">RELIGION</span>&nbsp; {{ $seeker->getFormattedReligion() }}</td>
        </tr>
        <tr class="row-16">
            <td colspan="4" rowspan="3" class="top">
                <span class="label">CIVIL STATUS</span><br>
                <span class="choice"><span class="box">{{ $checked($seeker->civil_status === 'single') }}</span>Single</span>
                <span class="choice"><span class="box">{{ $checked($seeker->civil_status === 'married') }}</span>Married</span><br>
                <span class="choice"><span class="box">{{ $checked($seeker->civil_status === 'widowed') }}</span>Widowed</span>
                <span class="choice"><span class="box">{{ $checked($seeker->civil_status === 'separated') }}</span>Separated</span>
            </td>
        </tr>
        <tr class="row-16"></tr>
        <tr class="row-16"></tr>
        <tr>
            <td colspan="2" class="label">TIN</td>
            <td colspan="6" class="value">{{ $text($seeker->tin) }}</td>
            <td colspan="2" class="label">HEIGHT (FT.)</td>
            <td colspan="2" class="value center">{{ $heightDisplay }}</td>
        </tr>
        <tr>
            <td colspan="8" rowspan="3" class="top">
                <span class="label">DISABILITY</span>&nbsp;&nbsp;
                <span class="choice"><span class="box">{{ $checked(in_array('visual', $disabilityTypes, true)) }}</span>Visual</span>
                <span class="choice"><span class="box">{{ $checked(in_array('speech', $disabilityTypes, true)) }}</span>Speech</span>
                <span class="choice"><span class="box">{{ $checked(in_array('mental', $disabilityTypes, true)) }}</span>Mental</span><br>
                <span class="choice"><span class="box">{{ $checked(in_array('hearing', $disabilityTypes, true)) }}</span>Hearing</span>
                <span class="choice"><span class="box">{{ $checked(in_array('physical', $disabilityTypes, true)) }}</span>Physical</span>
                <span class="choice"><span class="box">{{ $checked(in_array('others', $disabilityTypes, true)) }}</span>Others</span>
                Please specify: <span class="line">{{ $text($otherDisability, '') }}</span>
            </td>
            <td colspan="2" class="label">CONTACT<br>NUMBER/S</td>
            <td colspan="2" class="value">{{ $text($seeker->mobile_number) }}</td>
        </tr>
        <tr>
            <td colspan="2" class="label">E-MAIL</td>
            <td colspan="2" class="value small">{{ $text($seeker->email) }}</td>
        </tr>
        <tr class="row-12">
            <td colspan="4"></td>
        </tr>
    </table>

    <table class="tight">
        <tr><td colspan="12" class="section">EMPLOYMENT STATUS / TYPE</td></tr>
        <tr>
            <td colspan="6" class="top" style="height: 190pt;">
                <span class="choice"><span class="box">{{ $checked($seeker->employment_status === 'employed') }}</span><strong>Employed</strong></span><br><br>
                &nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->employment_type === 'wage_employed') }}</span>Wage employed<br>
                &nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->employment_type === 'self_employed') }}</span>Self-employed (Please specify)<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'fisherman_fisherfolk') }}</span>Fisherman/Fisherfolk<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'vendor_retailer') }}</span>Vendor/Retailer<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'home_based_worker') }}</span>Home-based worker<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'transport') }}</span>Transport<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'domestic_worker') }}</span>Domestic Worker<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'freelancer') }}</span>Freelancer<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'artisan_craft_worker') }}</span>Artisan/Craft Worker<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->self_employed_type === 'others') }}</span>Others (Please specify):
                <span class="line">{{ $text($seeker->self_employed_type_others, '') }}</span>
            </td>
            <td colspan="6" class="top">
                <span class="choice"><span class="box">{{ $checked($seeker->employment_status === 'unemployed') }}</span><strong>Unemployed</strong></span><br>
                &nbsp;&nbsp;&nbsp;&nbsp;How long have you been looking for work? (months)
                <span class="line" style="min-width: 38pt;">{{ $text($seeker->unemployment_months, '') }}</span><br><br>
                <span class="box">{{ $checked($seeker->unemployment_reason === 'fresh_graduate') }}</span>New Entrant/Fresh Graduate
                &nbsp;&nbsp;<span class="box">{{ $checked($seeker->unemployment_reason === 'terminated_local') }}</span>Terminated/Laid off (local)<br><br>
                <span class="box">{{ $checked($seeker->unemployment_reason === 'finished_contract') }}</span>Finished Contract
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->unemployment_reason === 'terminated_abroad') }}</span>Terminated/Laid off (abroad)<br>
                <span style="margin-left: 144pt;">specify country: <span class="line" style="min-width: 55pt;">{{ $text($seeker->unemployment_terminated_country, '') }}</span></span><br><br>
                <span class="box">{{ $checked($seeker->unemployment_reason === 'resigned') }}</span>Resigned
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span class="box">{{ $checked($seeker->unemployment_reason === 'others') }}</span>Others, please specify:<br>
                <span style="margin-left: 165pt;" class="line">{{ $text($seeker->unemployment_reason_others, '') }}</span><br><br>
                <span class="box">{{ $checked($seeker->unemployment_reason === 'retired') }}</span>Retired<br><br>
                <span class="box">{{ $checked($seeker->unemployment_reason === 'terminated_calamity') }}</span>Terminated/Laid off due to calamity
            </td>
        </tr>
        <tr>
            <td colspan="4" class="row-28 top">
                Are you an OFW?
                <span class="box">{{ $checked($seeker->is_ofw) }}</span>Yes
                <span class="box">{{ $checked(! $seeker->is_ofw) }}</span>No<br>
                Specify country <span class="line">{{ $text($seeker->ofw_country, '') }}</span>
            </td>
            <td colspan="8" class="row-28 top">
                Are you a former OFW?
                <span class="box">{{ $checked($seeker->is_former_ofw) }}</span>Yes
                <span class="box">{{ $checked(! $seeker->is_former_ofw) }}</span>No<br>
                Latest country of deployment <span class="line">{{ $text($seeker->former_ofw_country, '') }}</span><br>
                Month and year of return to Philippines
                <span class="line">{{ $seeker->former_ofw_return_date ? $date($seeker->former_ofw_return_date, 'm/Y') : '' }}</span>
            </td>
        </tr>
        <tr class="row-16">
            <td colspan="12">
                Are you a 4Ps beneficiary?
                <span class="box">{{ $checked($seeker->is_4ps_beneficiary) }}</span>Yes
                <span class="box">{{ $checked(! $seeker->is_4ps_beneficiary) }}</span>No
                &nbsp;&nbsp; If yes, please provide Household ID No.
                <span class="line" style="min-width: 155pt;">{{ $text($seeker->household_id_4ps, '') }}</span>
            </td>
        </tr>
    </table>

    <table class="tight">
        <tr><td colspan="12" class="section">II. JOB PREFERENCE</td></tr>
        <tr>
            <th colspan="4">PREFERRED OCCUPATION</th>
            <th colspan="8">PREFERRED WORK LOCATION</th>
        </tr>
        <tr class="row-17">
            <td colspan="4">
                <span class="box">{{ $checked($seeker->work_type_preference === 'part_time') }}</span>Part-time
                &nbsp;&nbsp;&nbsp;<span class="box">{{ $checked($seeker->work_type_preference === 'full_time') }}</span>Full-time
            </td>
            <td colspan="4">
                <span class="box">{{ $checked($seeker->preferred_work_location === 'local') }}</span>
                Local (specify cities/municipalities):
            </td>
            <td colspan="4">
                <span class="box">{{ $checked($seeker->preferred_work_location === 'overseas') }}</span>
                Overseas (specify countries):
            </td>
        </tr>
        @for($i = 0; $i < 3; $i++)
            <tr class="row-18">
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="3">{{ optional($occupations->get($i))->occupation_title }}</td>
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="3">{{ $seeker->preferred_work_location === 'local' ? $preferredLocations->get($i) : '' }}</td>
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="3">{{ $seeker->preferred_work_location === 'overseas' ? $preferredLocations->get($i) : '' }}</td>
            </tr>
        @endfor
    </table>

    <table class="tight">
        <tr><td colspan="5" class="section">III. LANGUAGE / DIALECT PROFICIENCY <span style="font-weight: 500; text-transform: none;">(check if applicable)</span></td></tr>
        <tr>
            <th>LANGUAGE/DIALECT</th>
            <th>READ</th>
            <th>WRITE</th>
            <th>SPEAK</th>
            <th>UNDERSTAND</th>
        </tr>
        @foreach(['english' => 'English', 'filipino' => 'Filipino', 'mandarin' => 'Mandarin'] as $key => $label)
            @php
                $language = $languageRecords->get($key);
            @endphp
            <tr class="row-17">
                <td class="label">{{ $label }}</td>
                <td class="center"><span class="box">{{ $checked(optional($language)->can_read) }}</span></td>
                <td class="center"><span class="box">{{ $checked(optional($language)->can_write) }}</span></td>
                <td class="center"><span class="box">{{ $checked(optional($language)->can_speak) }}</span></td>
                <td class="center"><span class="box">{{ $checked(optional($language)->can_understand) }}</span></td>
            </tr>
        @endforeach
        <tr class="row-17">
            <td class="label">Others: <span class="line">{{ $otherLanguageNames }}</span></td>
            <td class="center"><span class="box">{{ $checked(optional($otherLanguage)->can_read) }}</span></td>
            <td class="center"><span class="box">{{ $checked(optional($otherLanguage)->can_write) }}</span></td>
            <td class="center"><span class="box">{{ $checked(optional($otherLanguage)->can_speak) }}</span></td>
            <td class="center"><span class="box">{{ $checked(optional($otherLanguage)->can_understand) }}</span></td>
        </tr>
    </table>

    <div class="page-number">Page 1 of 2</div>
</div>

<div class="page">
    <table class="tight">
        <tr><td colspan="10" class="section">IV. EDUCATIONAL BACKGROUND</td></tr>
        <tr class="row-15">
            <td colspan="10">
                <span class="label">Currently in school?</span>
                <span class="box">{{ $checked($seeker->currently_in_school) }}</span>Yes
                &nbsp;&nbsp;&nbsp;<span class="box">{{ $checked(! $seeker->currently_in_school) }}</span>No
            </td>
        </tr>
        <tr>
            <th colspan="2" rowspan="2">LEVEL</th>
            <th colspan="4" rowspan="2">COURSE</th>
            <th rowspan="2">YEAR<br>GRADUATED</th>
            <th colspan="3">IF UNDERGRADUATE</th>
        </tr>
        <tr>
            <th>LEVEL<br>REACHED</th>
            <th colspan="2">YEAR LAST<br>ATTENDED</th>
        </tr>
        @php
            $elementary = $educationByLevel->get('elementary');
        @endphp
        <tr class="row-24">
            <td colspan="2" class="label">Elementary</td>
            <td colspan="4">{{ optional($elementary)->course_strand }}</td>
            <td class="center">{{ optional($elementary)->year_graduated }}</td>
            <td class="center">{{ optional($elementary)->undergrad_level_reached }}</td>
            <td colspan="2" class="center">{{ optional($elementary)->undergrad_year_last_attended }}</td>
        </tr>
        @php
            $secondaryNonK12 = $educationByLevel->get('secondary_non_k12');
            $secondaryK12 = $educationByLevel->get('secondary_k12');
            $seniorHigh = $educationByLevel->get('senior_high_strand');
            $secondary = $secondaryNonK12 ?: ($secondaryK12 ?: $seniorHigh);
        @endphp
        <tr class="row-42">
            <td colspan="2" class="top">
                <span class="box">{{ $checked((bool) $secondaryNonK12) }}</span>Secondary<br>
                &nbsp;&nbsp;&nbsp;&nbsp;(Non-K12)
            </td>
            <td colspan="2" class="top">
                <span class="box">{{ $checked((bool) ($secondaryK12 ?: $seniorHigh)) }}</span>Secondary<br>
                &nbsp;&nbsp;&nbsp;&nbsp;(K-12)
            </td>
            <td colspan="2" class="top">
                <span class="label">Senior High Strand:</span><br>
                {{ optional($seniorHigh)->course_strand ?: optional($secondaryK12)->course_strand }}
            </td>
            <td class="center">{{ optional($secondary)->year_graduated }}</td>
            <td class="center">{{ optional($secondary)->undergrad_level_reached }}</td>
            <td colspan="2" class="center">{{ optional($secondary)->undergrad_year_last_attended }}</td>
        </tr>
        @php
            $tertiary = $educationByLevel->get('tertiary');
        @endphp
        <tr class="row-24">
            <td colspan="2" class="label">Tertiary</td>
            <td colspan="4">{{ optional($tertiary)->course_strand }}</td>
            <td class="center">{{ optional($tertiary)->year_graduated }}</td>
            <td class="center">{{ optional($tertiary)->undergrad_level_reached }}</td>
            <td colspan="2" class="center">{{ optional($tertiary)->undergrad_year_last_attended }}</td>
        </tr>
        @php
            $graduate = $educationByLevel->get('graduate_studies');
        @endphp
        <tr class="row-28">
            <td colspan="2" class="label">Graduate Studies/<br>Post-graduate</td>
            <td colspan="4">{{ optional($graduate)->course_strand }}</td>
            <td class="center">{{ optional($graduate)->year_graduated }}</td>
            <td class="center">{{ optional($graduate)->undergrad_level_reached }}</td>
            <td colspan="2" class="center">{{ optional($graduate)->undergrad_year_last_attended }}</td>
        </tr>
    </table>

    <table class="tight">
        <tr>
            <td colspan="10" class="section">
                V. TECHNICAL/VOCATIONAL AND OTHER TRAINING
                <span style="font-weight: 500; text-transform: none;">(Include courses taken as part of college education)</span>
            </td>
        </tr>
        <tr>
            <th colspan="3">TRAINING/VOCATIONAL COURSE</th>
            <th>HOURS<br>OF<br>TRAINING</th>
            <th colspan="2">TRAINING<br>INSTITUTION</th>
            <th colspan="2">SKILLS ACQUIRED</th>
            <th colspan="2">CERTIFICATES<br>RECEIVED<br><span class="tiny">(NC I, NC II, NC III, NC IV, etc.)</span></th>
        </tr>
        @for($i = 0; $i < 3; $i++)
            @php
                $training = $trainings->get($i);
            @endphp
            <tr class="row-19">
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="2">{{ optional($training)->course }}</td>
                <td class="center">{{ optional($training)->hours_of_training }}</td>
                <td colspan="2">{{ optional($training)->training_institution }}</td>
                <td colspan="2">{{ optional($training)->skills_acquired }}</td>
                <td colspan="2">{{ optional($training)->certificates_received }}</td>
            </tr>
        @endfor
    </table>

    <table class="tight">
        <tr><td colspan="10" class="section">VI. ELIGIBILITY / PROFESSIONAL LICENSE</td></tr>
        <tr>
            <th colspan="3">ELIGIBILITY<br><span class="small">(Civil Service)</span></th>
            <th>DATE<br>TAKEN</th>
            <th colspan="4">PROFESSIONAL LICENSE (PRC)</th>
            <th colspan="2">VALID UNTIL</th>
        </tr>
        @for($i = 0; $i < 2; $i++)
            @php
                $civil = $civilEligibilities->get($i);
                $license = $professionalLicenses->get($i);
            @endphp
            <tr class="row-18">
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="2">{{ optional($civil)->name }}</td>
                <td class="center">{{ optional($civil)->date_taken ? $date($civil->date_taken) : '' }}</td>
                <td class="number">{{ $i + 1 }}.</td>
                <td colspan="3">{{ optional($license)->name }}</td>
                <td colspan="2" class="center">{{ optional($license)->valid_until ? $date($license->valid_until) : '' }}</td>
            </tr>
        @endfor
    </table>

    <table class="tight">
        <tr>
            <td colspan="10" class="section">
                VII. WORK EXPERIENCE
                <span style="font-weight: 500; text-transform: none;">(Limit to 10 year period, start with the most recent employment)</span>
            </td>
        </tr>
        <tr>
            <th colspan="2">COMPANY NAME</th>
            <th colspan="2">ADDRESS<br><span class="small">(City/Municipality)</span></th>
            <th colspan="2">POSITION</th>
            <th colspan="2">NUMBER<br>OF MONTHS</th>
            <th colspan="2">STATUS<br><span class="tiny">(Permanent, Contractual, Part-time, Probationary)</span></th>
        </tr>
        @for($i = 0; $i < 3; $i++)
            @php
                $experience = $workExperiences->get($i);
            @endphp
            <tr class="row-24">
                <td colspan="2">{{ optional($experience)->company_name }}</td>
                <td colspan="2">{{ optional($experience)->company_address }}</td>
                <td colspan="2">{{ optional($experience)->position }}</td>
                <td colspan="2" class="center">{{ optional($experience)->number_of_months }}</td>
                <td colspan="2" class="center">{{ filled(optional($experience)->employment_status) ? $enum($experience->employment_status) : '' }}</td>
            </tr>
        @endfor
    </table>

    <table class="tight">
        <tr><td colspan="3" class="section">VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE</td></tr>
        @php
            $skillColumns = [
                ['auto_mechanic', 'beautician', 'carpentry_work', 'computer_literate', 'domestic_chores', 'driver'],
                ['electrician', 'embroidery', 'gardening', 'masonry', 'painter_artist', 'painting_jobs'],
                ['photography', 'plumbing', 'sewing_dresses', 'stenography', 'tailoring'],
            ];
        @endphp
        <tr>
            @foreach($skillColumns as $columnIndex => $skillColumn)
                <td class="top row-74">
                    @foreach($skillColumn as $skillKey)
                        <span class="box">{{ $checked($hasStandardSkill($skillKey)) }}</span>
                        {{ strtoupper($standardSkillLabels[$skillKey]) }}<br>
                    @endforeach
                    @if($columnIndex === 2)
                        <span class="box">{{ $checked(filled($otherStandardSkills)) }}</span>
                        OTHERS: <span class="line">{{ $otherStandardSkills }}</span>
                    @endif
                </td>
            @endforeach
        </tr>
    </table>

    <table class="tight">
        <tr><td class="section center">CERTIFICATION/AUTHORIZATION</td></tr>
        <tr>
            <td class="certification row-55 top">
                This is to certify that all data/information that I have provided in this form are true and to the
                best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment
                Information System and use my personal information for employment facilitation. I am also aware that
                DOLE is not obliged to seek employment on my behalf.
                <br><br>
                <table class="no-border">
                    <tr>
                        <td class="no-border center" style="width: 50%;">
                            <span class="signature-line"></span><br>
                            <strong>Signature of Applicant</strong>
                        </td>
                        <td class="no-border center" style="width: 50%;">
                            <span class="signature-line"></span><br>
                            <strong>Date</strong>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="tight">
        <tr><td colspan="2" class="section center dotted">FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.</td></tr>
        <tr>
            <td class="top row-92" style="width: 43%;">
                <span class="label">Referred to:</span><br>
                <span class="box"></span>SPES
                &nbsp;&nbsp;&nbsp;&nbsp;<span class="box"></span>DILEEP<br>
                <span class="box"></span>GIP
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="box"></span>TESDA Training<br>
                <span class="box"></span>TUPAD<br>
                <span class="box"></span>JobStart<br>
                <span class="box"></span>Others, specify: <span class="line"></span>
            </td>
            <td class="top">
                <span class="label">Assessed by:</span><br><br><br><br>
                <table class="no-border">
                    <tr>
                        <td class="no-border center" style="width: 72%;">
                            <span class="signature-line" style="width: 205pt;"></span><br>
                            <strong>Signature over Printed Name of Assessor</strong>
                        </td>
                        <td class="no-border center">
                            <span class="signature-line" style="width: 70pt;"></span><br>
                            <strong>Date</strong>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="page-number">Page 2 of 2</div>
</div>
</body>
</html>
