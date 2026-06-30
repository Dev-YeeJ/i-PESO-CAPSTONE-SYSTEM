<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 18px 20px 22px; }
        body { font-family: DejaVu Sans, sans-serif; color: #111; font-size: 8px; }
        h1 { margin: 0; text-align: center; font-size: 16px; letter-spacing: 0; }
        .form-code { margin-top: 2px; text-align: center; font-size: 10px; font-weight: bold; }
        .meta, .applicants, .legend { width: 100%; border-collapse: collapse; }
        .meta { margin-top: 9px; }
        .meta td { border: 1px solid #111; padding: 4px 5px; vertical-align: top; }
        .label { display: block; color: #444; font-size: 6.5px; font-weight: bold; text-transform: uppercase; }
        .value { display: block; margin-top: 1px; font-size: 8px; font-weight: bold; }
        .section-title { margin: 8px 0 3px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .applicants { table-layout: fixed; }
        .applicants thead { display: table-header-group; }
        .applicants th, .applicants td { border: 1px solid #111; padding: 3px 2px; vertical-align: top; word-wrap: break-word; }
        .applicants th { background: #e5e7eb; text-align: center; font-size: 6.2px; }
        .applicants td { font-size: 6.5px; }
        .center { text-align: center; }
        .summary { margin-top: 5px; font-size: 7px; }
        .legend { margin-top: 7px; }
        .legend td { width: 50%; border: 1px solid #555; padding: 4px; vertical-align: top; font-size: 6.4px; line-height: 1.35; }
        .submission { width: 100%; margin-top: 9px; border-collapse: collapse; }
        .submission td { width: 25%; padding: 4px 8px 2px 0; vertical-align: bottom; }
        .signature { height: 18px; border-bottom: 1px solid #111; font-weight: bold; }
        .signature-label { padding-top: 2px; color: #444; font-size: 6.5px; }
        .page-break { page-break-after: always; }
        .muted { color: #555; }
    </style>
</head>
<body>
@forelse($reports as $reportIndex => $report)
    <div class="{{ $reportIndex < count($reports) - 1 ? 'page-break' : '' }}">
        <h1>ESTABLISHMENT REPORT</h1>
        <div class="form-code">RO1-JF Form 3</div>

        <table class="meta">
            <tr>
                <td colspan="2"><span class="label">Name of Establishment</span><span class="value">{{ $report['establishment']['name'] }}</span></td>
                <td colspan="2"><span class="label">Office Location</span><span class="value">{{ $report['establishment']['office_location'] }}</span></td>
            </tr>
            <tr>
                <td><span class="label">Contact Details</span><span class="value">{{ $report['establishment']['contact_details'] }}</span></td>
                <td><span class="label">Date of Activity</span><span class="value">{{ $report['establishment']['date_of_activity'] }}</span></td>
                <td><span class="label">Job Fair Name</span><span class="value">{{ $report['establishment']['job_fair_name'] }}</span></td>
                <td><span class="label">Job Fair Venue / Date</span><span class="value">{{ $report['establishment']['job_fair_venue'] }} / {{ $report['establishment']['job_fair_date'] }}</span></td>
            </tr>
            <tr>
                <td colspan="2"><span class="label">Employer Representative / Submitted By</span><span class="value">{{ $report['establishment']['submitted_by'] }}</span></td>
                <td><span class="label">Email Address</span><span class="value">{{ $report['establishment']['email'] }}</span></td>
                <td><span class="label">Mobile Number</span><span class="value">{{ $report['establishment']['mobile_number'] }}</span></td>
            </tr>
        </table>

        <div class="section-title">Job Seeker Information</div>
        <table class="applicants">
            <thead>
                <tr>
                    <th style="width:2.5%">No.</th>
                    <th style="width:10%">Name of Jobseeker</th>
                    <th style="width:9%">Position Applying For</th>
                    <th style="width:4%">Sex</th>
                    <th style="width:7%">City / Municipality</th>
                    <th style="width:7%">Telephone / Mobile</th>
                    <th style="width:7%">Age Range</th>
                    <th style="width:3.5%">Educ.</th>
                    <th style="width:9%">Jobseeker Classification</th>
                    <th style="width:8%">Application Status</th>
                    <th style="width:9%">Employer Mismatch Reason</th>
                    <th style="width:8%">Job Seeker Mismatch Reason</th>
                    <th style="width:10%">Details</th>
                    <th style="width:6%">Source</th>
                </tr>
            </thead>
            <tbody>
                @forelse($report['entries'] as $index => $entry)
                    <tr>
                        <td class="center">{{ $index + 1 }}</td>
                        <td>{{ $entry['name'] }}</td>
                        <td>{{ $entry['position_applying_for'] }}</td>
                        <td class="center">{{ $entry['sex'] }}</td>
                        <td>{{ $entry['residence_city'] }}</td>
                        <td>{{ $entry['contact_number'] }}</td>
                        <td>{{ $entry['age_range'] }}</td>
                        <td class="center"><strong>{{ $entry['educational_attainment_code'] }}</strong></td>
                        <td>{{ implode(', ', $entry['jobseeker_classifications']) }}</td>
                        <td>{{ $entry['application_status'] }}</td>
                        <td>{{ $entry['employer_mismatch_reason'] }}</td>
                        <td>{{ $entry['seeker_mismatch_reason'] }}</td>
                        <td>{{ $entry['mismatch_reason_details'] }}</td>
                        <td>{{ $entry['source_label'] }}</td>
                    </tr>
                @empty
                    <tr><td colspan="14" class="center">No job seeker records match the selected report filters.</td></tr>
                @endforelse
            </tbody>
        </table>

        <div class="summary">
            <strong>Total:</strong> {{ $report['summary']['total'] }} &nbsp;|&nbsp;
            <strong>Qualified:</strong> {{ $report['summary']['qualified'] }} &nbsp;|&nbsp;
            <strong>Near Hired:</strong> {{ $report['summary']['near_hired'] }} &nbsp;|&nbsp;
            <strong>HOTS:</strong> {{ $report['summary']['hots'] }} &nbsp;|&nbsp;
            <strong>Interviewed:</strong> {{ $report['summary']['interviewed'] }} &nbsp;|&nbsp;
            <strong>Rejected:</strong> {{ $report['summary']['rejected'] }}
        </div>

        <table class="legend">
            <tr>
                <td>
                    <strong>Educational Attainment Codes</strong><br>
                    H = Elementary / High School; E = K-12 Senior High School; C = College;
                    P = Post Graduate; N = Education not completed / unavailable.<br><br>
                    <strong>Age Ranges</strong><br>
                    15-24; 25-34; 35-44; 45-54; 55-64; 65 years old and above.
                </td>
                <td>
                    <strong>Mismatch Reasons</strong><br>
                    Employer: Salary expectation; lack of competencies/skills; lack of professional license or TESDA certification;
                    incomplete documentary requirements; other reason.<br>
                    Job seeker: Skill mismatch; transportation/location; unacceptable working environment; other reason.
                </td>
            </tr>
        </table>

        <div class="section-title">Submission</div>
        <table class="submission">
            <tr>
                <td><div class="signature">{{ $report['establishment']['submitted_by'] }}</div><div class="signature-label">Submitted by / Employer Representative</div></td>
                <td><div class="signature">{{ $report['establishment']['signature_name'] }}</div><div class="signature-label">Signature Name Placeholder</div></td>
                <td><div class="signature">{{ $report['establishment']['email'] }}<br>{{ $report['establishment']['mobile_number'] }}</div><div class="signature-label">Email Address / Mobile Number</div></td>
                <td><div class="signature">{{ $report['establishment']['submission_date'] }}</div><div class="signature-label">Submission Date</div></td>
            </tr>
        </table>

        <p class="muted">Generated by i-PESO from authenticated applicant, vacancy, ATS, and Job Fair records on {{ now()->format('F d, Y h:i A') }}.</p>
    </div>
@empty
    <h1>ESTABLISHMENT REPORT</h1>
    <div class="form-code">RO1-JF Form 3</div>
    <p class="center" style="margin-top:30px;">No establishment records match the selected filters.</p>
@endforelse
</body>
</html>
