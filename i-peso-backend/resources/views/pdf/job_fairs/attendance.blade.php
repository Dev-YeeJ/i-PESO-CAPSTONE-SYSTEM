<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Job Fair Attendance Report — {{ $referenceNo }}</title>
<style>
  @page { margin: 22px 26px 40px 26px; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 8.4px; color: #0f172a; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; }
  .muted { color: #64748b; }

  /* ── Title ── */
  .title-wrap { text-align: center; margin: 7px 0 6px; }
  .title { font-family: 'DejaVu Serif', serif; font-size: 15px; font-weight: bold; letter-spacing: 2px; color: #123563; }
  .subtitle { font-size: 8.6px; color: #334155; margin-top: 2px; }
  .ref { font-size: 7.6px; color: #64748b; margin-top: 2px; letter-spacing: .3px; }

  /* ── Event panel ── */
  .panel { border: .8px solid #94a3b8; }
  .panel-head { background: #123563; color: #ffffff; font-size: 7.6px; font-weight: bold; letter-spacing: .8px; text-transform: uppercase; padding: 3px 7px; }
  .kv td { padding: 1.7px 7px; border-bottom: .5px solid #e2e8f0; vertical-align: top; }
  .kv tr:last-child td { border-bottom: none; }
  .kv .k { width: 17%; font-size: 7px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .3px; }
  .kv .v { width: 33%; font-size: 8.2px; }

  /* ── Summary ── */
  .summary { margin-top: 6px; }
  .summary td { border: .8px solid #cbd5e1; text-align: center; padding: 3px 4px; background: #f8fafc; }
  .summary .num { font-family: 'DejaVu Serif', serif; font-size: 13px; font-weight: bold; color: #123563; }
  .summary .lbl { font-size: 6.8px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .5px; margin-top: 1px; }

  /* ── Register ── */
  .section-title { margin: 8px 0 4px; font-size: 8px; font-weight: bold; color: #123563; letter-spacing: .8px; text-transform: uppercase; border-bottom: .8px solid #123563; padding-bottom: 2px; }
  .grid th, .grid td { border: .6px solid #94a3b8; padding: 3px 4px; vertical-align: middle; }
  .grid thead th { background: #e8eef7; color: #123563; font-size: 6.6px; font-weight: bold; text-transform: uppercase; letter-spacing: .3px; text-align: center; line-height: 1.2; }
  .grid tbody td { font-size: 7.4px; vertical-align: top; }
  .grid tbody tr:nth-child(even) td { background: #f8fafc; }
  .grid .c { text-align: center; }
  .grid .name { font-weight: bold; }
  .grid .sub { font-size: 6.8px; color: #64748b; }
  .grid tfoot td { font-size: 7.4px; font-weight: bold; background: #f1f5f9; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }

  .type { display: inline-block; padding: 1px 5px; border-radius: 5px; font-size: 6.8px; font-weight: bold; }
  .type-registered { background: #dcfce7; color: #166534; }
  .type-walkin { background: #fef3c7; color: #92400e; }

  .empty { border: 1px dashed #94a3b8; background: #f8fafc; text-align: center; padding: 14px; }
  .empty .big { font-family: 'DejaVu Serif', serif; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; color: #123563; }

  /* ── Certification & signatures ── */
  .closing { page-break-inside: avoid; }
  .cert { margin-top: 8px; font-size: 7.8px; color: #334155; }
  .cert .gap { padding-left: 2.5px; } /* dompdf drops the space before this bold run */
  .sigs { margin-top: 8px; }
  .sigs td { width: 50%; vertical-align: top; padding: 0 40px 0 0; }
  .sig-label { font-size: 7.2px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .5px; }
  .sig-line { border-bottom: .8px solid #0f172a; height: 22px; width: 260px; }
  .sig-name { font-weight: bold; font-size: 8.4px; margin-top: 2px; text-transform: uppercase; }
  .sig-role { font-size: 7.4px; color: #475569; }
  .sig-date { font-size: 7.2px; color: #64748b; margin-top: 1px; }

  /* ── Footer (every page; "Page X of Y" is stamped by PdfPageNumbers) ── */
  .footer { position: fixed; bottom: -26px; left: 0; right: 0; border-top: .6px solid #cbd5e1; padding-top: 3px; font-size: 6.6px; color: #64748b; }
  .footer td { padding: 0; vertical-align: top; }
</style>
</head>
<body>

<div class="footer">
  <table><tr>
    <td style="width:60%">
      <strong>CONFIDENTIAL.</strong> Contains personal information of job seekers protected under the Data Privacy Act of 2012 (R.A. 10173). For official PESO use only.
    </td>
    <td style="width:40%;text-align:right;padding-right:92px">
      {{ $referenceNo }} &middot; Generated via i-PESO on {{ $generatedAt }}
    </td>
  </tr></table>
</div>

@include('pdf.partials.letterhead')

<div class="title-wrap">
  <div class="title">JOB FAIR ATTENDANCE REPORT</div>
  <div class="subtitle">Register of Job Seekers Who Attended &middot; <strong>{{ $fair->title }}</strong></div>
  <div class="ref">Reference No. {{ $referenceNo }}</div>
</div>

{{-- ── Event details ── --}}
<div class="panel">
  <div class="panel-head">I. Event Information</div>
  <table class="kv">
    <tr>
      <td class="k">Name of Job Fair</td><td class="v"><strong>{{ $fair->title }}</strong></td>
      <td class="k">Event Status</td><td class="v">{{ $event['status'] }}</td>
    </tr>
    <tr>
      <td class="k">Date of Event</td><td class="v">{{ $event['date'] }}</td>
      <td class="k">Time</td><td class="v">{{ $event['time'] }}</td>
    </tr>
    <tr>
      <td class="k">Venue</td><td class="v">{{ $event['venue'] }}</td>
      <td class="k">Address</td><td class="v">{{ $event['address'] }}</td>
    </tr>
    <tr>
      <td class="k">Target Sector</td><td class="v">{{ $event['target_sector'] }}</td>
      <td class="k">Partner Agencies</td><td class="v">{{ $event['partner_agencies'] }}</td>
    </tr>
  </table>
</div>

{{-- ── Summary ── --}}
<table class="summary"><tr>
  <td style="width:16.66%"><div class="num">{{ $summary['total'] }}</div><div class="lbl">Total Attendees</div></td>
  <td style="width:16.66%"><div class="num">{{ $summary['registered'] }}</div><div class="lbl">i-PESO Registered</div></td>
  <td style="width:16.66%"><div class="num">{{ $summary['walk_in'] }}</div><div class="lbl">Walk-in</div></td>
  <td style="width:16.66%"><div class="num">{{ $summary['male'] }}</div><div class="lbl">Male</div></td>
  <td style="width:16.66%"><div class="num">{{ $summary['female'] }}</div><div class="lbl">Female</div></td>
  <td style="width:16.7%"><div class="num">{{ $summary['employers'] }}</div><div class="lbl">Participating Employers</div></td>
</tr></table>

{{-- ── Register ── --}}
<div class="section-title">II. Register of Attendees</div>

@if(count($rows) === 0)
  <div class="empty">
    <div class="big">NO ATTENDANCE RECORDED</div>
    <div style="margin-top:4px">No job seekers have been checked in at this event's information desk yet.</div>
  </div>
@else
  <table class="grid">
    <thead>
      <tr>
        <th style="width:3%">No.</th>
        <th style="width:6%">Time In</th>
        <th style="width:14%">Name of Job Seeker</th>
        <th style="width:5.5%">Sex</th>
        <th style="width:15%">Contact Details<br><span style="font-weight:normal;text-transform:none">(Mobile / E-mail)</span></th>
        <th style="width:11%">Job Preference</th>
        <th style="width:11%">Preferred Work Location</th>
        <th style="width:8%">Language / Dialect</th>
        <th style="width:20%">Educational Background<br><span style="font-weight:normal;text-transform:none">(Attainment · School · Course · Year)</span></th>
        <th style="width:6.5%">Type</th>
      </tr>
    </thead>
    <tbody>
      @foreach($rows as $index => $row)
        <tr>
          <td class="c">{{ $index + 1 }}</td>
          <td class="c">{{ $row['time_in'] }}</td>
          <td class="name">{{ $row['name'] ?: '—' }}</td>
          <td class="c">{{ in_array(strtolower((string) $row['gender']), ['', 'unknown'], true) ? '—' : $row['gender'] }}</td>
          <td>
            {{ $row['contact_number'] ?: '—' }}
            @if($row['email'] && $row['email'] !== 'N/A')<div class="sub">{{ $row['email'] }}</div>@endif
          </td>
          <td>{{ $row['job_preference'] }}</td>
          <td>{{ $row['preferred_work_location'] }}</td>
          <td>{{ $row['language'] }}</td>
          <td>
            <strong>{{ $row['education_attainment'] }}</strong>
            @if($row['school'] !== 'N/A')<div class="sub">{{ $row['school'] }}</div>@endif
            @php
              $courseYear = collect([$row['course'], $row['year_graduated']])
                  ->filter(fn ($value) => filled($value) && $value !== 'N/A')
                  ->implode(' · ');
            @endphp
            @if($courseYear)<div class="sub">{{ $courseYear }}</div>@endif
          </td>
          <td class="c">
            <span class="type {{ $row['type'] === 'Registered' ? 'type-registered' : 'type-walkin' }}">{{ $row['type'] }}</span>
          </td>
        </tr>
      @endforeach
    </tbody>
    <tfoot>
      <tr>
        <td colspan="10">
          Total: {{ $summary['total'] }} attendee{{ $summary['total'] === 1 ? '' : 's' }}
          &nbsp;&middot;&nbsp; Registered: {{ $summary['registered'] }}
          &nbsp;&middot;&nbsp; Walk-in: {{ $summary['walk_in'] }}
          &nbsp;&middot;&nbsp; Male: {{ $summary['male'] }}
          &nbsp;&middot;&nbsp; Female: {{ $summary['female'] }}
          @if($summary['unspecified'] > 0)&nbsp;&middot;&nbsp; Sex not specified: {{ $summary['unspecified'] }}@endif
        </td>
      </tr>
    </tfoot>
  </table>
@endif

{{-- ── Certification & signatures ── --}}
<div class="closing">
<div class="cert">This is to certify that the foregoing is a true and correct record of the job seekers who attended <strong class="gap">{{ $fair->title }}</strong>, as checked in at the event's information desk through the i-PESO system.</div>

<table class="sigs"><tr>
  <td>
    <div class="sig-label">Prepared by:</div>
    <div class="sig-line"></div>
    <div class="sig-name">@if($preparedBy){{ $preparedBy }}@else&nbsp;@endif</div>
    <div class="sig-role">PESO Staff, Urdaneta City</div>
    <div class="sig-date">Date: {{ $generatedDate }}</div>
  </td>
  <td>
    <div class="sig-label">Noted by:</div>
    <div class="sig-line"></div>
    <div class="sig-name">&nbsp;</div>
    <div class="sig-role">PESO Manager, Urdaneta City</div>
    <div class="sig-date">Date: ____________________</div>
  </td>
</tr></table>
</div>

</body>
</html>
