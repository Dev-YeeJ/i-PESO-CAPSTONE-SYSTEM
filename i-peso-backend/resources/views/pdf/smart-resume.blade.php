<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Resume - {{ $seeker->first_name }} {{ $seeker->last_name }}</title>
    <style>
        @page { margin: 34px 42px; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #1e293b; font-size: 10px; line-height: 1.45; }
        h1, h2, p { margin: 0; }
        .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 14px; }
        .name { color: #0f172a; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; }
        .headline { color: #1d4ed8; font-size: 11px; margin-top: 3px; }
        .contact { color: #475569; margin-top: 7px; }
        .section { margin-top: 14px; page-break-inside: avoid; }
        .section-title { color: #1d4ed8; border-bottom: 1px solid #bfdbfe; font-size: 11px; font-weight: bold; padding-bottom: 3px; text-transform: uppercase; letter-spacing: .7px; }
        .entry { margin-top: 8px; page-break-inside: avoid; }
        .entry-title { font-size: 10.5px; font-weight: bold; color: #0f172a; }
        .muted { color: #64748b; }
        .meta { float: right; color: #64748b; }
        .skills span { display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 3px 6px; margin: 5px 4px 0 0; border-radius: 3px; }
        .two-col { width: 100%; border-collapse: collapse; }
        .two-col td { width: 50%; vertical-align: top; padding-right: 12px; }
        .footer { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #94a3b8; font-size: 8px; text-align: center; }
    </style>
</head>
<body>
    @php
        $preferredRole = optional($seeker->occupations->first())->occupation_title;
        $address = $seeker->getFullAddress();
    @endphp

    <div class="header">
        <div class="name">{{ $seeker->first_name }} {{ $seeker->middle_name }} {{ $seeker->last_name }} {{ $seeker->suffix }}</div>
        <div class="headline">{{ $preferredRole ?: ($seeker->educ_attainment ?: 'Registered i-PESO Job Seeker') }}</div>
        <div class="contact">
            {{ $seeker->mobile_number }} | {{ $seeker->email }}
            @if($address) | {{ $address }} @endif
        </div>
    </div>

    <div class="section">
        <div class="section-title">Professional Profile</div>
        <p style="margin-top: 7px;">
            DOLE NSRP-registered job seeker
            @if($preferredRole) seeking opportunities in {{ $preferredRole }}@endif.
            Educational attainment: {{ $seeker->educ_attainment ?: 'not specified' }}.
            Preferred work arrangement: {{ str_replace('_', ' ', $seeker->work_type_preference ?: 'open to suitable opportunities') }}.
        </p>
    </div>

    @if($seeker->seekerSkills->isNotEmpty())
        <div class="section skills">
            <div class="section-title">Skills</div>
            @foreach($seeker->seekerSkills as $skill)
                <span>{{ $skill->skill_name }}</span>
            @endforeach
        </div>
    @endif

    @if($seeker->workExperiences->isNotEmpty())
        <div class="section">
            <div class="section-title">Work Experience</div>
            @foreach($seeker->workExperiences as $experience)
                <div class="entry">
                    <span class="meta">{{ $experience->number_of_months ? $experience->number_of_months.' months' : '' }}</span>
                    <div class="entry-title">{{ $experience->position }}</div>
                    <div>{{ $experience->company_name }}</div>
                    <div class="muted">{{ $experience->company_address }} {{ $experience->employment_status ? '| '.str_replace('_', ' ', $experience->employment_status) : '' }}</div>
                </div>
            @endforeach
        </div>
    @endif

    <table class="two-col">
        <tr>
            <td>
                @if($seeker->educations->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Education</div>
                        @foreach($seeker->educations->sortByDesc('year_graduated') as $education)
                            <div class="entry">
                                <div class="entry-title">{{ ucwords(str_replace('_', ' ', $education->level)) }}</div>
                                <div>{{ $education->course_strand }}</div>
                                <div class="muted">{{ $education->year_graduated ?: $education->undergrad_level_reached }}</div>
                            </div>
                        @endforeach
                    </div>
                @endif
            </td>
            <td>
                @if($seeker->trainings->isNotEmpty() || $seeker->certificates->isNotEmpty())
                    <div class="section">
                        <div class="section-title">Training & Certificates</div>
                        @foreach($seeker->trainings as $training)
                            <div class="entry">
                                <div class="entry-title">{{ $training->course }}</div>
                                <div>{{ $training->training_institution }}</div>
                                <div class="muted">{{ $training->hours_of_training ? $training->hours_of_training.' hours' : '' }}</div>
                            </div>
                        @endforeach
                        @foreach($seeker->certificates as $certificate)
                            <div class="entry">
                                <div class="entry-title">{{ $certificate->title }}</div>
                                <div>{{ $certificate->issuing_body }}</div>
                                <div class="muted">{{ $certificate->issued_at?->format('F Y') }}</div>
                            </div>
                        @endforeach
                    </div>
                @endif
            </td>
        </tr>
    </table>

    @if($seeker->eligibilities->isNotEmpty())
        <div class="section">
            <div class="section-title">Eligibility & Licenses</div>
            @foreach($seeker->eligibilities as $eligibility)
                <div class="entry">
                    <span class="entry-title">{{ $eligibility->name }}</span>
                    <span class="muted"> - {{ ucwords(str_replace('_', ' ', $eligibility->type)) }}</span>
                </div>
            @endforeach
        </div>
    @endif

    <div class="footer">
        Generated from verified information supplied through the i-PESO DOLE NSRP profile on {{ $generatedDate->format('F d, Y') }}.
    </div>
</body>
</html>
