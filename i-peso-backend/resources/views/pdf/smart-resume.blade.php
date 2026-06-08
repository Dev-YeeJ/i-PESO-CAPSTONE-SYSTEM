<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Professional Resume - {{ $seeker->first_name }} {{ $seeker->last_name }}</title>
    <style>
        @page { margin: 28px 34px 34px; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #253247; font-size: 9.5px; line-height: 1.45; }
        h1, h2, p { margin: 0; }
        .header { width: 100%; border-collapse: collapse; border-bottom: 4px solid #1e4f8f; padding-bottom: 14px; }
        .header-photo { width: 104px; vertical-align: top; }
        .photo { width: 92px; height: 92px; border: 1px solid #cbd5e1; object-fit: cover; }
        .header-main { vertical-align: middle; padding-left: 2px; }
        .name { color: #102a4c; font-size: 24px; line-height: 1.15; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; }
        .role { color: #1e4f8f; font-size: 11px; font-weight: bold; margin-top: 4px; }
        .contact { margin-top: 9px; color: #475569; line-height: 1.65; }
        .contact strong { color: #253247; }
        .layout { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .main { width: 66%; vertical-align: top; padding-right: 18px; }
        .sidebar { width: 34%; vertical-align: top; border-left: 1px solid #dbe3ee; padding-left: 16px; }
        .section { margin-bottom: 15px; page-break-inside: avoid; }
        .section-title { color: #1e4f8f; border-bottom: 1px solid #9fb8d8; font-size: 10.5px; font-weight: bold; padding-bottom: 3px; margin-bottom: 7px; text-transform: uppercase; letter-spacing: .8px; }
        .summary { color: #334155; text-align: justify; }
        .entry { margin-bottom: 9px; page-break-inside: avoid; }
        .entry:last-child { margin-bottom: 0; }
        .entry-title { color: #172033; font-size: 10px; font-weight: bold; }
        .entry-subtitle { color: #1e4f8f; font-weight: bold; margin-top: 1px; }
        .meta { color: #64748b; font-size: 8.5px; margin-top: 2px; }
        .skill-group { margin-bottom: 8px; }
        .skill-label { color: #64748b; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 3px; }
        .skill { display: inline-block; margin: 0 3px 4px 0; border: 1px solid #bfd0e5; background: #f3f7fb; color: #244f80; padding: 2px 5px; border-radius: 2px; }
        .list-item { border-left: 2px solid #9fb8d8; padding-left: 7px; margin-bottom: 5px; }
        .footer { position: fixed; bottom: -20px; left: 0; right: 0; border-top: 1px solid #dbe3ee; padding-top: 5px; color: #8492a6; font-size: 7.5px; text-align: center; }
    </style>
</head>
<body>
    @php
        $preferredRole = optional($seeker->occupations->first())->occupation_title;
        $address = $seeker->getFullAddress();
        $fullName = collect([$seeker->first_name, $seeker->middle_name, $seeker->last_name, $seeker->suffix])->filter()->join(' ');
        $education = $seeker->educations->sortByDesc(fn ($item) => $item->year_graduated ?? $item->undergrad_year_last_attended ?? 0);
        $technicalSkills = $skillsByType->get('technical', collect());
        $doleSkills = $skillsByType->get('dole_standard', collect());
        $softSkills = $skillsByType->get('soft', collect());
        $preferredLocations = collect($seeker->preferred_locations_details ?? [])->filter()->join(', ');
    @endphp

    <table class="header">
        <tr>
            <td class="header-photo">
                <img class="photo" src="{{ $profilePhoto }}" alt="2x2 profile photo">
            </td>
            <td class="header-main">
                <h1 class="name">{{ $fullName }}</h1>
                <div class="role">{{ $preferredRole ?: ($seeker->educ_attainment ?: 'Registered Job Seeker') }}</div>
                <div class="contact">
                    <strong>Mobile:</strong> {{ $seeker->mobile_number }}
                    &nbsp;&nbsp; <strong>Email:</strong> {{ $seeker->email }}<br>
                    @if($address)<strong>Address:</strong> {{ $address }}@endif
                </div>
            </td>
        </tr>
    </table>

    <table class="layout">
        <tr>
            <td class="main">
                <div class="section">
                    <div class="section-title">Professional Summary</div>
                    <p class="summary">
                        {{ $seeker->educ_attainment ?: 'Qualified' }} job seeker registered through the DOLE National Skills Registration Program
                        @if($preferredRole), pursuing opportunities as {{ $preferredRole }}@endif.
                        @if($technicalSkills->isNotEmpty())
                            Brings practical capability in {{ $technicalSkills->take(3)->pluck('skill_name')->join(', ') }}.
                        @elseif($doleSkills->isNotEmpty())
                            Brings practical capability in {{ $doleSkills->take(3)->pluck('skill_name')->join(', ') }}.
                        @endif
                        @if($seeker->workExperiences->isNotEmpty())
                            Has documented experience across {{ $seeker->workExperiences->count() }} role{{ $seeker->workExperiences->count() === 1 ? '' : 's' }}.
                        @endif
                        Ready to contribute dependable, professional service in a suitable organization.
                    </p>
                </div>

                @if($seeker->workExperiences->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Work Experience</div>
                        @foreach($seeker->workExperiences as $experience)
                            <div class="entry">
                                <div class="entry-title">{{ $experience->position }}</div>
                                <div class="entry-subtitle">{{ $experience->company_name }}</div>
                                <div class="meta">
                                    {{ collect([$experience->company_address, $experience->employment_status ? ucwords(str_replace('_', ' ', $experience->employment_status)) : null, $experience->number_of_months ? $experience->number_of_months.' months' : null])->filter()->join(' | ') }}
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                @if($education->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Education</div>
                        @foreach($education as $item)
                            <div class="entry">
                                <div class="entry-title">{{ $item->course_strand ?: ucwords(str_replace('_', ' ', $item->level)) }}</div>
                                <div class="entry-subtitle">{{ ucwords(str_replace('_', ' ', $item->level)) }}</div>
                                <div class="meta">
                                    {{ $item->year_graduated ? 'Graduated '.$item->year_graduated : collect([$item->undergrad_level_reached, $item->undergrad_year_last_attended ? 'Last attended '.$item->undergrad_year_last_attended : null])->filter()->join(' | ') }}
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                @if($seeker->trainings->isNotEmpty() || $seeker->certificates->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Training & Certifications</div>
                        @foreach($seeker->trainings as $training)
                            <div class="entry">
                                <div class="entry-title">{{ $training->course }}</div>
                                <div class="entry-subtitle">{{ $training->training_institution ?: 'Training record' }}</div>
                                <div class="meta">
                                    {{ collect([$training->hours_of_training ? $training->hours_of_training.' training hours' : null, $training->certificates_received])->filter()->join(' | ') }}
                                </div>
                            </div>
                        @endforeach
                        @foreach($seeker->certificates as $certificate)
                            <div class="entry">
                                <div class="entry-title">{{ $certificate->title }}</div>
                                <div class="entry-subtitle">{{ $certificate->issuing_body }}</div>
                                @if($certificate->issued_at)<div class="meta">Issued {{ $certificate->issued_at->format('F Y') }}</div>@endif
                            </div>
                        @endforeach
                    </div>
                @endif
            </td>

            <td class="sidebar">
                @if($seeker->seekerSkills->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Core Skills</div>
                        @foreach([
                            ['Technical', $technicalSkills],
                            ['DOLE Skills', $doleSkills],
                            ['Professional', $softSkills],
                        ] as [$label, $skills])
                            @if($skills->isNotEmpty())
                                <div class="skill-group">
                                    <div class="skill-label">{{ $label }}</div>
                                    @foreach($skills as $skill)<span class="skill">{{ $skill->skill_name }}</span>@endforeach
                                </div>
                            @endif
                        @endforeach
                    </div>
                @endif

                @if($seeker->occupations->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Target Roles</div>
                        @foreach($seeker->occupations as $occupation)
                            <div class="list-item">{{ $occupation->occupation_title }}</div>
                        @endforeach
                    </div>
                @endif

                @if($seeker->eligibilities->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Eligibility & Licenses</div>
                        @foreach($seeker->eligibilities as $eligibility)
                            <div class="entry">
                                <div class="entry-title">{{ $eligibility->name }}</div>
                                <div class="meta">
                                    {{ ucwords(str_replace('_', ' ', $eligibility->type)) }}
                                    @if($eligibility->valid_until) | Valid until {{ $eligibility->valid_until->format('M Y') }}@endif
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                @if($seeker->languages->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Languages</div>
                        @foreach($seeker->languages as $language)
                            <div class="entry">
                                <div class="entry-title">{{ $language->language === 'others' ? $language->language_other : $language->language }}</div>
                                <div class="meta">
                                    {{ collect([
                                        $language->can_speak ? 'Speak' : null,
                                        $language->can_read ? 'Read' : null,
                                        $language->can_write ? 'Write' : null,
                                        $language->can_understand ? 'Understand' : null,
                                    ])->filter()->join(', ') }}
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                <div class="section">
                    <div class="section-title">Work Preferences</div>
                    @if($seeker->work_type_preference)
                        <div class="list-item">{{ ucwords(str_replace('_', ' ', $seeker->work_type_preference)) }}</div>
                    @endif
                    @if($preferredLocations)
                        <div class="list-item">{{ $preferredLocations }}</div>
                    @elseif($seeker->preferred_work_location)
                        <div class="list-item">{{ ucwords(str_replace('_', ' ', $seeker->preferred_work_location)) }}</div>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        Generated from information supplied in the i-PESO DOLE NSRP profile on {{ $generatedDate->format('F d, Y') }}.
    </div>
</body>
</html>
