<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Resume - {{ $seeker->first_name }} {{ $seeker->last_name }}</title>
    <style>
        @page { margin: 30px 38px 34px; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #111827;
            font-family: Helvetica, Arial, sans-serif;
            font-size: 10px;
            line-height: 1.45;
        }
        h1, h2, h3, p { margin: 0; }
        .header {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
        }
        .header-main { vertical-align: top; padding-right: 18px; }
        .header-photo { width: 82px; vertical-align: top; text-align: right; }
        .photo {
            width: 76px;
            height: 76px;
            border: 1px solid #9ca3af;
            object-fit: cover;
        }
        .name {
            color: #111827;
            font-size: 22px;
            line-height: 1.1;
            font-weight: bold;
            letter-spacing: .8px;
            text-transform: uppercase;
        }
        .role {
            margin-top: 4px;
            color: #374151;
            font-size: 10.5px;
            font-weight: bold;
            letter-spacing: .35px;
            text-transform: uppercase;
        }
        .contact {
            margin-top: 8px;
            color: #4b5563;
            font-size: 9px;
            line-height: 1.55;
        }
        .section {
            margin-top: 14px;
            page-break-inside: avoid;
        }
        .section-title {
            border-bottom: 1px solid #9ca3af;
            color: #111827;
            font-size: 9.5px;
            font-weight: bold;
            letter-spacing: .9px;
            padding-bottom: 3px;
            text-transform: uppercase;
        }
        .section-body { margin-top: 7px; }
        .summary { color: #1f2937; text-align: justify; }
        .entry {
            margin-bottom: 10px;
            page-break-inside: avoid;
        }
        .entry:last-child { margin-bottom: 0; }
        .entry-table {
            width: 100%;
            border-collapse: collapse;
        }
        .entry-title {
            color: #111827;
            font-size: 10px;
            font-weight: bold;
        }
        .entry-date {
            width: 120px;
            color: #4b5563;
            font-size: 8.5px;
            font-weight: bold;
            text-align: right;
            text-transform: uppercase;
            vertical-align: top;
        }
        .entry-subtitle {
            color: #374151;
            font-size: 9.5px;
            font-weight: bold;
            margin-top: 1px;
        }
        .meta {
            color: #6b7280;
            font-size: 8.5px;
            margin-top: 2px;
        }
        ul {
            margin: 4px 0 0 14px;
            padding: 0;
        }
        li { margin-bottom: 2px; }
        .skill-line {
            margin-bottom: 4px;
            color: #1f2937;
        }
        .skill-line strong { color: #111827; }
        .footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            border-top: 1px solid #d1d5db;
            color: #6b7280;
            font-size: 7.5px;
            padding-top: 5px;
            text-align: center;
        }
    </style>
</head>
<body>
    @php
        $label = fn ($value) => \Illuminate\Support\Str::of((string) $value)->replace(['_', '-'], ' ')->title();
        $preferredRole = optional($seeker->occupations->first())->occupation_title;
        $address = $seeker->getFullAddress();
        $fullName = collect([$seeker->first_name, $seeker->middle_name, $seeker->last_name, $seeker->suffix])->filter()->join(' ');
        $education = $seeker->educations
            ->sortByDesc(fn ($item) => $item->year_graduated ?? $item->undergrad_year_last_attended ?? $item->expected_year_graduated ?? $item->year_started ?? 0);
        $experiences = $seeker->workExperiences
            ->sortByDesc(fn ($item) => optional($item->end_date ?? $item->start_date ?? $item->created_at)->timestamp ?? 0);
        $technicalSkills = $skillsByType->get('technical', collect());
        $doleSkills = $skillsByType->get('dole_standard', collect());
        $softSkills = $skillsByType->get('soft', collect());
        $hardSkillNames = $technicalSkills
            ->concat($doleSkills)
            ->pluck('skill_name')
            ->filter()
            ->unique(fn ($skill) => strtolower($skill))
            ->take(18)
            ->values();
        $softSkillNames = $softSkills
            ->pluck('skill_name')
            ->filter()
            ->unique(fn ($skill) => strtolower($skill))
            ->take(12)
            ->values();
        $formatDate = function ($date) {
            return $date ? $date->format('M Y') : null;
        };
        $experienceDates = function ($experience) use ($formatDate) {
            if ($experience->start_date) {
                return collect([
                    $formatDate($experience->start_date),
                    $experience->currently_employed ? 'Present' : $formatDate($experience->end_date),
                ])->filter()->join(' - ');
            }

            return $experience->number_of_months ? $experience->number_of_months.' months' : 'Dates not specified';
        };
        $educationDates = function ($item) {
            $endYear = $item->year_graduated
                ?? $item->undergrad_year_last_attended
                ?? ($item->completion_status === 'currently_studying' ? 'Present' : null)
                ?? $item->expected_year_graduated;

            return collect([$item->year_started, $endYear])->filter()->join(' - ');
        };
        $responsibilityLines = function ($experience) use ($responsibilityOverrides) {
            $raw = $responsibilityOverrides[(string) $experience->getKey()] ?? $experience->responsibilities ?? '';

            return collect(preg_split('/\r\n|\r|\n/', (string) $raw))
                ->map(fn ($line) => trim(preg_replace('/^[-*]\s*/', '', $line)))
                ->filter()
                ->take(5)
                ->values();
        };
        $languageSummaries = $seeker->languages
            ->map(function ($language) use ($label) {
                $languageName = $language->language === 'others' ? $language->language_other : $language->language;
                $abilities = collect([
                    $language->can_speak ? 'Speak' : null,
                    $language->can_read ? 'Read' : null,
                    $language->can_write ? 'Write' : null,
                    $language->can_understand ? 'Understand' : null,
                ])->filter()->join('/');

                return collect([(string) $label($languageName), $abilities])->filter()->join(' - ');
            })
            ->filter()
            ->values();
        $summary = filled($professionalSummary)
            ? $professionalSummary
            : trim(($seeker->educ_attainment ?: 'Qualified').' job seeker'
                .($preferredRole ? ' pursuing opportunities as '.$preferredRole : '')
                .($hardSkillNames->isNotEmpty() ? ', with strengths in '.$hardSkillNames->take(4)->join(', ') : '')
                .'. Brings dependable service, workplace readiness, and a commitment to continuous learning.');
    @endphp

    <table class="header">
        <tr>
            <td class="header-main">
                <h1 class="name">{{ $fullName }}</h1>
                <div class="role">{{ $preferredRole ?: ($seeker->educ_attainment ?: 'Registered Job Seeker') }}</div>
                <div class="contact">
                    {{ collect([$seeker->mobile_number, $seeker->email, $address])->filter()->join(' | ') }}
                </div>
            </td>
            <td class="header-photo">
                <img class="photo" src="{{ $profilePhoto }}" alt="2x2 profile photo">
            </td>
        </tr>
    </table>

    <section class="section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="section-body">
            <p class="summary">{{ $summary }}</p>
        </div>
    </section>

    @if($hardSkillNames->isNotEmpty() || $softSkillNames->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="section-body">
                @if($hardSkillNames->isNotEmpty())
                    <p class="skill-line"><strong>Technical and hard skills:</strong> {{ $hardSkillNames->join(', ') }}</p>
                @endif
                @if($softSkillNames->isNotEmpty())
                    <p class="skill-line"><strong>Soft skills:</strong> {{ $softSkillNames->join(', ') }}</p>
                @endif
            </div>
        </section>
    @endif

    @if($experiences->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Work Experience</h2>
            <div class="section-body">
                @foreach($experiences as $experience)
                    @php($duties = $responsibilityLines($experience))
                    <div class="entry">
                        <table class="entry-table">
                            <tr>
                                <td>
                                    <h3 class="entry-title">{{ $experience->position ?: 'Position not specified' }}</h3>
                                    <p class="entry-subtitle">{{ $experience->company_name ?: 'Company not specified' }}</p>
                                    @if($experience->company_address || $experience->employment_status)
                                        <p class="meta">
                                            {{ collect([$experience->company_address, $experience->employment_status ? $label($experience->employment_status) : null])->filter()->join(' | ') }}
                                        </p>
                                    @endif
                                </td>
                                <td class="entry-date">{{ $experienceDates($experience) }}</td>
                            </tr>
                        </table>
                        @if($duties->isNotEmpty())
                            <ul>
                                @foreach($duties as $duty)
                                    <li>{{ $duty }}</li>
                                @endforeach
                            </ul>
                        @else
                            <ul>
                                <li>Performed assigned {{ strtolower($experience->position ?: 'role') }} duties with accuracy, professionalism, and attention to workplace standards.</li>
                            </ul>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>
    @endif

    @if($education->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Education</h2>
            <div class="section-body">
                @foreach($education as $item)
                    <div class="entry">
                        <table class="entry-table">
                            <tr>
                                <td>
                                    <h3 class="entry-title">{{ $item->course_strand ?: $label($item->level) }}</h3>
                                    <p class="entry-subtitle">{{ $item->institution_name ?: $label($item->level) }}</p>
                                    <p class="meta">{{ $item->completion_status ? $label($item->completion_status) : 'Education record' }}</p>
                                </td>
                                <td class="entry-date">{{ $educationDates($item) ?: ($item->year_graduated ? 'Graduated '.$item->year_graduated : '') }}</td>
                            </tr>
                        </table>
                    </div>
                @endforeach
            </div>
        </section>
    @elseif($seeker->educ_attainment)
        <section class="section">
            <h2 class="section-title">Education</h2>
            <div class="section-body">
                <p>{{ $seeker->educ_attainment }}</p>
            </div>
        </section>
    @endif

    @if($seeker->trainings->isNotEmpty() || $seeker->certificates->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Training & Certifications</h2>
            <div class="section-body">
                @foreach($seeker->trainings as $training)
                    <div class="entry">
                        <h3 class="entry-title">{{ $training->course }}</h3>
                        <p class="entry-subtitle">{{ $training->training_institution ?: 'Training record' }}</p>
                        <p class="meta">
                            {{ collect([$training->hours_of_training ? $training->hours_of_training.' hours' : null, $training->certificates_received])->filter()->join(' | ') }}
                        </p>
                    </div>
                @endforeach
                @foreach($seeker->certificates as $certificate)
                    <div class="entry">
                        <h3 class="entry-title">{{ $certificate->title }}</h3>
                        <p class="entry-subtitle">{{ $certificate->issuing_body ?: 'Certificate' }}</p>
                        @if($certificate->issued_at)<p class="meta">Issued {{ $certificate->issued_at->format('M Y') }}</p>@endif
                    </div>
                @endforeach
            </div>
        </section>
    @endif

    @if($seeker->eligibilities->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Licenses & Eligibility</h2>
            <div class="section-body">
                @foreach($seeker->eligibilities as $eligibility)
                    <div class="entry">
                        <h3 class="entry-title">{{ $eligibility->name }}</h3>
                        <p class="meta">
                            {{ $label($eligibility->type) }}
                            @if($eligibility->valid_until) | Valid until {{ $eligibility->valid_until->format('M Y') }}@endif
                        </p>
                    </div>
                @endforeach
            </div>
        </section>
    @endif

    @if($languageSummaries->isNotEmpty())
        <section class="section">
            <h2 class="section-title">Languages</h2>
            <div class="section-body">
                <p>{{ $languageSummaries->join(', ') }}</p>
            </div>
        </section>
    @endif

    <div class="footer">
        Generated from the i-PESO DOLE NSRP profile on {{ $generatedDate->format('F d, Y') }}.
    </div>
</body>
</html>
