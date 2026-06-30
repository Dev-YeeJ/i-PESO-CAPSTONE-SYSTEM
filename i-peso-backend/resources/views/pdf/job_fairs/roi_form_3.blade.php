<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
        h2 { font-size: 13px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #9ca3af; padding: 7px; text-align: left; vertical-align: top; }
        th { background: #e5e7eb; }
        .meta { margin-top: 12px; line-height: 1.5; }
        .grid { width: 100%; margin-top: 12px; }
        .grid td { width: 25%; text-align: center; }
        .count { font-size: 18px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>ESTABLISHMENT REPORT</h1>
    <div style="text-align:center; font-weight:bold;">RO1-JF Form 3</div>

    <div class="meta">
        <strong>Establishment:</strong> {{ $employer->company_name ?? $employer->trade_name ?? $employer->email }}<br>
        <strong>Representative:</strong> {{ $employer->representative_name ?? trim(($employer->representative_first_name ?? '') . ' ' . ($employer->representative_last_name ?? '')) }}<br>
        <strong>Event:</strong> {{ $fair->title }}<br>
        <strong>Venue:</strong> {{ $fair->venue }}<br>
        <strong>Date:</strong> {{ optional($fair->start_date ?? $fair->event_date)->format('F d, Y') }}
    </div>

    <table class="grid">
        <tr>
            <td><div class="count">{{ $summary['vacancies'] }}</div>Linked Vacancies</td>
            <td><div class="count">{{ $summary['applicants'] }}</div>Applicants Screened</td>
            <td><div class="count">{{ $summary['hots'] }}</div>HOTS</td>
            <td><div class="count">{{ $summary['mismatches'] }}</div>Mismatch Cases</td>
        </tr>
    </table>

    <h2>Applicant Action Register</h2>
    <table>
        <thead>
            <tr>
                <th>Applicant</th>
                <th>Vacancy</th>
                <th>Status</th>
                <th>HOTS</th>
                <th>Mismatch Code</th>
                <th>Placement Details</th>
            </tr>
        </thead>
        <tbody>
            @forelse($applications as $application)
                <tr>
                    <td>{{ trim(($application->jobSeeker->first_name ?? '') . ' ' . ($application->jobSeeker->last_name ?? '')) }}</td>
                    <td>{{ $application->jobVacancy->job_title ?? 'N/A' }}</td>
                    <td>{{ ucfirst($application->status) }}</td>
                    <td>{{ $application->is_hots ? 'Yes' : 'No' }}</td>
                    <td>{{ $application->dole_mismatch_code ?? 'N/A' }}</td>
                    <td>
                        @if($application->placement_start_date)
                            Start: {{ $application->placement_start_date->format('F d, Y') }}<br>
                            Salary: PHP {{ number_format((float) $application->placement_salary, 2) }}
                        @else
                            N/A
                        @endif
                    </td>
                </tr>
            @empty
                <tr><td colspan="6">No applicant actions recorded.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Mismatch Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Mismatch Code</th>
                <th>Count</th>
            </tr>
        </thead>
        <tbody>
            @forelse($applications->whereNotNull('dole_mismatch_code')->groupBy('dole_mismatch_code') as $code => $items)
                <tr><td>{{ $code }}</td><td>{{ $items->count() }}</td></tr>
            @empty
                <tr><td colspan="2">No mismatch codes recorded.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
