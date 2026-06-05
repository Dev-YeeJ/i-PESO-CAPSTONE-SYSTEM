<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>NSRP Form - {{ $seeker->last_name }}, {{ $seeker->first_name }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #333;
            background: white;
        }

        .container {
            width: 100%;
            max-width: 8.5in;
            margin: 0 auto;
        }

        /* Header */
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }

        .header-title {
            font-weight: bold;
            font-size: 10px;
            letter-spacing: 0.5px;
        }

        .header-subtitle {
            font-weight: bold;
            font-size: 12px;
            margin: 2px 0;
        }

        .header-form-title {
            font-weight: bold;
            font-size: 11px;
            margin-top: 3px;
        }

        /* Form Instructions */
        .instructions {
            background-color: #f5f5f5;
            border: 1px solid #ccc;
            padding: 6px;
            margin-bottom: 8px;
            font-size: 9px;
            line-height: 1.4;
        }

        /* Section Titles */
        .section-title {
            background-color: #1a2234;
            color: white;
            padding: 4px 6px;
            font-weight: bold;
            font-size: 10px;
            margin-top: 10px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Table Structure */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }

        th, td {
            border: 1px solid #999;
            padding: 4px 5px;
            text-align: left;
            font-size: 10px;
        }

        th {
            background-color: #e8e8e8;
            font-weight: bold;
            text-align: center;
        }

        .field-label {
            font-weight: bold;
            background-color: #f0f0f0;
            width: 25%;
        }

        .field-value {
            padding-left: 8px;
        }

        /* Two-column layout */
        .row {
            display: table;
            width: 100%;
            margin-bottom: 4px;
        }

        .col {
            display: table-cell;
            padding: 0 4px;
            width: 50%;
            vertical-align: top;
        }

        .col-full {
            width: 100%;
        }

        /* Info Boxes */
        .info-box {
            border: 1px solid #999;
            padding: 6px;
            margin-bottom: 4px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
        }

        .info-label {
            font-weight: bold;
            width: 40%;
        }

        .info-value {
            width: 60%;
            border-bottom: 1px solid #999;
            padding-left: 4px;
        }

        /* Footer */
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #999;
            font-size: 9px;
            text-align: center;
            color: #666;
        }

        /* Badge */
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }

        .badge-verified {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .badge-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .badge-rejected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        /* Page Break */
        .page-break {
            page-break-after: always;
            margin-bottom: 20px;
        }

        /* Verification Badge */
        .verification-status {
            margin-top: 8px;
            padding: 6px;
            background-color: #f0f0f0;
            border-left: 4px solid #007bff;
        }

        .verification-status.verified {
            border-left-color: #28a745;
            background-color: #d4edda;
        }

        .verification-status.rejected {
            border-left-color: #dc3545;
            background-color: #f8d7da;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-title">Republic of the Philippines</div>
            <div class="header-title">Department of Labor and Employment</div>
            <div class="header-subtitle">NATIONAL SKILLS REGISTRATION PROGRAM</div>
            <div class="header-form-title">JOBSEEKER REGISTRATION FORM (NSRP Form 1)</div>
            <div style="font-size: 9px; margin-top: 2px; color: #666;">
                Generated on: {{ $generatedDate->format('F d, Y \a\t H:i A') }}
            </div>
        </div>

        <!-- I. PERSONAL INFORMATION -->
        <div class="section-title">I. PERSONAL INFORMATION</div>

        <table>
            <tr>
                <td colspan="4" style="padding: 6px; font-weight: bold;">
                    <span style="font-size: 11px;">
                        {{ strtoupper($seeker->last_name) }}, {{ strtoupper($seeker->first_name) }}
                        @if($seeker->middle_name)
                            {{ strtoupper(substr($seeker->middle_name, 0, 1)) }}.
                        @endif
                        @if($seeker->suffix)
                            {{ strtoupper($seeker->suffix) }}
                        @endif
                    </span>
                </td>
            </tr>
            <tr>
                <td class="field-label">SEEKER ID:</td>
                <td class="field-value">{{ $seeker->seeker_id }}</td>
                <td class="field-label">DATE OF BIRTH:</td>
                <td class="field-value">
                    @if($seeker->date_of_birth)
                        {{ \Carbon\Carbon::parse($seeker->date_of_birth)->format('m/d/Y') }}
                    @else
                        N/A
                    @endif
                </td>
            </tr>
            <tr>
                <td class="field-label">SEX:</td>
                <td class="field-value">{{ ucfirst(str_replace('_', ' ', $seeker->sex ?? '')) ?: 'N/A' }}</td>
                <td class="field-label">CIVIL STATUS:</td>
                <td class="field-value">{{ ucfirst(str_replace('_', ' ', $seeker->civil_status ?? '')) ?: 'N/A' }}</td>
            </tr>
            <tr>
                <td class="field-label">RELIGION:</td>
                <td class="field-value">{{ $seeker->getFormattedReligion() }}</td>
                <td class="field-label">HEIGHT (FT):</td>
                <td class="field-value">{{ $seeker->height_ft ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="field-label">TIN:</td>
                <td class="field-value">{{ $seeker->tin ?? 'N/A' }}</td>
                <td class="field-label">CONTACT NUMBER/S:</td>
                <td class="field-value">{{ $seeker->mobile_number ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="field-label">EMAIL:</td>
                <td colspan="3" class="field-value">{{ $seeker->email }}</td>
            </tr>
        </table>

        <!-- Present Address -->
        <div class="section-title">PRESENT ADDRESS</div>

        <table>
            <tr>
                <td class="field-label">House No./Street Village:</td>
                <td colspan="3" class="field-value">{{ $seeker->address_house_street ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="field-label">Barangay:</td>
                <td class="field-value" style="width: 35%;">{{ $seeker->address_barangay ?? 'N/A' }}</td>
                <td class="field-label" style="width: 15%;">Municipality/City:</td>
                <td class="field-value">{{ $seeker->address_municipality_city ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="field-label">Province:</td>
                <td colspan="3" class="field-value">{{ $seeker->address_province ?? 'N/A' }}</td>
            </tr>
        </table>

        <!-- Disability Information -->
        <div class="section-title">DISABILITY INFORMATION</div>

        <table>
            <tr>
                <th style="width: 25%;">Disability Type</th>
                <th style="width: 75%;">Specification</th>
            </tr>
            @if($seeker->disabilities && $seeker->disabilities->count() > 0)
                @foreach($seeker->disabilities as $disability)
                    <tr>
                        <td>{{ $disability->disability_type }}</td>
                        <td>{{ $disability->disability_specification ?? 'N/A' }}</td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="2" style="text-align: center; color: #999;">None reported</td>
                </tr>
            @endif
        </table>

        <!-- II. EMPLOYMENT STATUS / TYPE -->
        <div class="section-title">II. EMPLOYMENT STATUS / TYPE</div>

        <table>
            <tr>
                <td class="field-label">Employment Status:</td>
                <td class="field-value" colspan="3">
                    <strong>{{ ucfirst(str_replace('_', ' ', $seeker->employment_status ?? '')) ?: 'N/A' }}</strong>
                </td>
            </tr>
            <tr>
                <td class="field-label">Employment Type:</td>
                <td class="field-value" colspan="3">
                    <strong>{{ ucfirst(str_replace('_', ' ', $seeker->employment_type)) ?? 'N/A' }}</strong>
                </td>
            </tr>
            <tr>
                <td class="field-label">Profile Completion:</td>
                <td class="field-value" colspan="3">
                    @if($seeker->profile_completed)
                        <span class="badge badge-verified">✓ Complete</span>
                    @else
                        <span class="badge badge-pending">⚠ Incomplete</span>
                    @endif
                </td>
            </tr>
        </table>

        <!-- III. JOB PREFERENCE -->
        <div class="section-title">III. JOB PREFERENCE</div>

        <table>
            <tr>
                <th style="width: 50%;">Preferred Occupations</th>
                <th style="width: 50%;">Preferred Work Locations</th>
            </tr>
            <tr>
                <td style="vertical-align: top;">
                    @if($seeker->occupations && $seeker->occupations->count() > 0)
                        <ol style="margin: 4px; padding-left: 20px;">
                            @foreach($seeker->occupations as $occ)
                                <li style="margin-bottom: 2px;">{{ $occ->occupation_title }}</li>
                            @endforeach
                        </ol>
                    @else
                        <span style="color: #999;">Not specified</span>
                    @endif
                </td>
                <td style="vertical-align: top;">
                    @if($seeker->workLocations && $seeker->workLocations->count() > 0)
                        <ol style="margin: 4px; padding-left: 20px;">
                            @foreach($seeker->workLocations as $loc)
                                <li style="margin-bottom: 2px;">
                                    @if($loc->location_type === 'local')
                                        {{ $loc->location_name }} (Local)
                                    @else
                                        {{ $loc->location_name }} (Overseas)
                                    @endif
                                </li>
                            @endforeach
                        </ol>
                    @else
                        <span style="color: #999;">Not specified</span>
                    @endif
                </td>
            </tr>
        </table>

        <!-- IV. LANGUAGE / DIALECT PROFICIENCY -->
        <div class="section-title">IV. LANGUAGE / DIALECT PROFICIENCY</div>

        <table>
            <tr>
                <th>Language/Dialect</th>
                <th style="width: 15%;">Read</th>
                <th style="width: 15%;">Write</th>
                <th style="width: 15%;">Speak</th>
                <th style="width: 15%;">Understand</th>
            </tr>
            @if($seeker->languages && $seeker->languages->count() > 0)
                @foreach($seeker->languages as $lang)
                    <tr>
                        <td>{{ ucfirst($lang->language) }}</td>
                        <td style="text-align: center;">{{ $lang->can_read ? '✓' : '—' }}</td>
                        <td style="text-align: center;">{{ $lang->can_write ? '✓' : '—' }}</td>
                        <td style="text-align: center;">{{ $lang->can_speak ? '✓' : '—' }}</td>
                        <td style="text-align: center;">{{ $lang->can_understand ? '✓' : '—' }}</td>
                    </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="5" style="text-align: center; color: #999;">No languages recorded</td>
                </tr>
            @endif
        </table>

        <!-- Footer -->
        <div class="footer">
            <p>This is an official digitized record generated from the i-PESO Employment Portal.</p>
            <p>For official requests, please contact the Public Employment Service Office (PESO) in your area.</p>
            <p style="margin-top: 8px; color: #999;">Document ID: NSRP-{{ $seeker->seeker_id }}-{{ $generatedDate->format('YmdHis') }}</p>
        </div>
    </div>
</body>
</html>
