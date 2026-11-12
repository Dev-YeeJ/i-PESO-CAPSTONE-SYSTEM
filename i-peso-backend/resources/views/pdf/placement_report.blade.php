<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Employer Placement Report — {{ $referenceNo }}</title>
<style>
  @page { margin: 22px 26px 40px 26px; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 8.4px; color: #0f172a; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; }
  .serif { font-family: 'DejaVu Serif', serif; }
  .muted { color: #64748b; }
  .upper { text-transform: uppercase; }

  /* ── Title ──────────────────────────────────────────────── */
  .title-wrap { text-align: center; margin: 7px 0 6px; }
  .title { font-family: 'DejaVu Serif', serif; font-size: 15px; font-weight: bold; letter-spacing: 2px; color: #123563; }
  .subtitle { font-size: 8.6px; color: #334155; margin-top: 2px; }
  .ref { font-size: 7.6px; color: #64748b; margin-top: 2px; letter-spacing: .3px; }

  /* ── Info panels ────────────────────────────────────────── */
  .panels > tbody > tr > td { vertical-align: top; padding: 0; }
  .panel { border: .8px solid #94a3b8; }
  .panel-head { background: #123563; color: #ffffff; font-size: 7.6px; font-weight: bold; letter-spacing: .8px; text-transform: uppercase; padding: 3px 7px; }
  .kv td { padding: 1.7px 7px; border-bottom: .5px solid #e2e8f0; vertical-align: top; }
  .kv tr:last-child td { border-bottom: none; }
  .kv .k { width: 34%; font-size: 7px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .3px; }
  .kv .v { font-size: 8.2px; color: #0f172a; }

  .status { display: inline-block; padding: 1px 6px; border-radius: 6px; font-size: 7.2px; font-weight: bold; letter-spacing: .3px; }
  .status-approved { background: #dcfce7; color: #166534; }
  .status-pending_review { background: #fef3c7; color: #92400e; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .status-pending_mapping { background: #e2e8f0; color: #334155; }

  /* ── Summary ────────────────────────────────────────────── */
  .summary { margin-top: 6px; }
  .summary td { width: 20%; border: .8px solid #cbd5e1; text-align: center; padding: 3px 4px; background: #f8fafc; }
  .summary .num { font-family: 'DejaVu Serif', serif; font-size: 13px; font-weight: bold; color: #123563; }
  .summary .lbl { font-size: 6.8px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .5px; margin-top: 1px; }

  /* ── Register ───────────────────────────────────────────── */
  .section-title { margin: 8px 0 4px; font-size: 8px; font-weight: bold; color: #123563; letter-spacing: .8px; text-transform: uppercase; border-bottom: .8px solid #123563; padding-bottom: 2px; }
  .grid th, .grid td { border: .6px solid #94a3b8; padding: 3px 4px; vertical-align: middle; }
  .grid thead th { background: #e8eef7; color: #123563; font-size: 6.6px; font-weight: bold; text-transform: uppercase; letter-spacing: .3px; text-align: center; line-height: 1.2; }
  .grid tbody td { font-size: 7.6px; }
  .grid tbody tr:nth-child(even) td { background: #f8fafc; }
  .grid .c { text-align: center; }
  .grid .name { font-weight: bold; }
  .grid tfoot td { font-size: 7.4px; font-weight: bold; background: #f1f5f9; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }

  .nil { border: 1px dashed #94a3b8; background: #f8fafc; text-align: center; padding: 14px; margin-top: 4px; }
  .nil .big { font-family: 'DejaVu Serif', serif; font-size: 13px; font-weight: bold; letter-spacing: 2px; color: #123563; }

  .remarks td { border: .6px solid #cbd5e1; padding: 4px 7px; vertical-align: top; font-size: 7.8px; }
  .remarks .k { width: 18%; font-size: 7px; font-weight: bold; color: #475569; text-transform: uppercase; background: #f8fafc; }

  /* ── Certification & signatures ─────────────────────────── */
  .closing { page-break-inside: avoid; }
  .cert .gap { padding-left: 2.5px; }
  .cert { margin-top: 8px; font-size: 7.8px; color: #334155; text-align: left; } /* dompdf drops spaces before <strong> in justified text */
  .sigs { margin-top: 8px; }
  .sigs td { width: 33.33%; vertical-align: top; padding: 0 14px 0 0; }
  .sig-label { font-size: 7.2px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: .5px; }
  .sig-line { border-bottom: .8px solid #0f172a; height: 22px; }
  .sig-name { font-weight: bold; font-size: 8.4px; margin-top: 2px; text-transform: uppercase; }
  .sig-role { font-size: 7.4px; color: #475569; }
  .sig-date { font-size: 7.2px; color: #64748b; margin-top: 1px; }

  /* ── Footer (every page) ────────────────────────────────── */
  .footer { position: fixed; bottom: -26px; left: 0; right: 0; border-top: .6px solid #cbd5e1; padding-top: 3px; font-size: 6.6px; color: #64748b; }
  .footer td { padding: 0; vertical-align: top; }
</style>
</head>
<body>

{{-- Footer first so dompdf repeats it on every page. --}}
<div class="footer">
  <table><tr>
    <td style="width:60%">
      <strong>CONFIDENTIAL.</strong> This report contains personal information protected under the Data Privacy Act of 2012 (R.A. 10173).
      For official PESO use only.
    </td>
    <td style="width:40%;text-align:right;padding-right:92px">
      {{ $referenceNo }} &middot; Generated via i-PESO on {{ $generatedAt }}
      {{-- "Page X of Y" is stamped onto each page by the controller (dompdf has no CSS total-pages counter). --}}
    </td>
  </tr></table>
</div>

{{-- ── Letterhead ── --}}
@include('pdf.partials.letterhead')

{{-- ── Title ── --}}
<div class="title-wrap">
  <div class="title">EMPLOYER PLACEMENT REPORT</div>
  <div class="subtitle">Monthly Report of Workers Hired &middot; Coverage Period: <strong>{{ $coverageLabel }}</strong></div>
  <div class="ref">Reference No. {{ $referenceNo }}</div>
</div>

{{-- ── Establishment & report details ── --}}
<table class="panels"><tr>
  <td style="width:57%;padding-right:8px">
    <div class="panel">
      <div class="panel-head">I. Establishment Information</div>
      <table class="kv">
        <tr><td class="k">Name of Establishment</td><td class="v"><strong>{{ $employer['name'] }}</strong></td></tr>
        @if($employer['trade_name'])
        <tr><td class="k">Trade / Business Name</td><td class="v">{{ $employer['trade_name'] }}</td></tr>
        @endif
        <tr><td class="k">Type of Establishment</td><td class="v">{{ $employer['company_type'] }}</td></tr>
        <tr><td class="k">Industry</td><td class="v">{{ $employer['industry'] }}</td></tr>
        <tr><td class="k">TIN</td><td class="v">{{ $employer['tin'] }}</td></tr>
        <tr><td class="k">Business Address</td><td class="v">{{ $employer['address'] }}</td></tr>
        <tr><td class="k">Contact Person</td><td class="v">{{ $employer['representative'] }}{{ $employer['designation'] !== '—' ? ', '.$employer['designation'] : '' }}</td></tr>
        <tr><td class="k">Contact No. / E-mail</td><td class="v">{{ $employer['contact_number'] }} &nbsp;/&nbsp; {{ $employer['email'] }}</td></tr>
      </table>
    </div>
  </td>
  <td style="width:43%">
    <div class="panel">
      <div class="panel-head">II. Report Details</div>
      <table class="kv">
        <tr><td class="k">Reference No.</td><td class="v"><strong>{{ $referenceNo }}</strong></td></tr>
        <tr><td class="k">Coverage Period</td><td class="v">{{ $coveragePeriod }}</td></tr>
        <tr><td class="k">Type of Report</td><td class="v">{{ $reportType }}</td></tr>
        <tr><td class="k">Report Status</td><td class="v"><span class="status status-{{ $report->status }}">{{ $statusLabel }}</span></td></tr>
        <tr><td class="k">Date Submitted</td><td class="v">{{ $submittedAt }}</td></tr>
        <tr><td class="k">Reviewed By</td><td class="v">{{ $reviewer['name'] }}{{ $reviewer['date'] ? ' · '.$reviewer['date'] : '' }}</td></tr>
        <tr><td class="k">Total Workers Reported</td><td class="v"><strong>{{ $summary['total'] }}</strong></td></tr>
      </table>
    </div>
  </td>
</tr></table>

{{-- ── Summary ── --}}
<table class="summary"><tr>
  <td><div class="num">{{ $summary['total'] }}</div><div class="lbl">Total Placed</div></td>
  <td><div class="num">{{ $summary['male'] }}</div><div class="lbl">Male</div></td>
  <td><div class="num">{{ $summary['female'] }}</div><div class="lbl">Female</div></td>
  <td><div class="num">{{ $summary['youth'] }}</div><div class="lbl">Youth (15–30 yrs)</div></td>
  <td><div class="num">{{ $summary['registered'] }}</div><div class="lbl">i-PESO Registered Jobseekers</div></td>
</tr></table>

{{-- ── Register of hired workers ── --}}
<div class="section-title">III. Register of Workers Hired</div>

@if($report->is_nil_report)
  <div class="nil">
    <div class="big">NIL REPORT</div>
    <div style="margin-top:4px">The establishment reported <strong>no workers hired</strong> for the coverage period {{ $coverageLabel }}.</div>
  </div>
@else
  <table class="grid">
    <thead>
      <tr>
        <th style="width:3%">No.</th>
        <th style="width:{{ $showAssignedCompany ? '14' : '16' }}%">Name of Worker<br><span style="font-weight:normal;text-transform:none">(Last, First Middle)</span></th>
        <th style="width:5%">Sex</th>
        <th style="width:6%">Civil Status</th>
        <th style="width:4%">Age</th>
        <th style="width:7.5%">Date of Birth</th>
        <th style="width:7.5%">Date Hired</th>
        <th style="width:{{ $showAssignedCompany ? '10' : '12' }}%">Position</th>
        <th style="width:8%">Department</th>
        <th style="width:{{ $showAssignedCompany ? '12' : '15' }}%">Address</th>
        <th style="width:10%">Highest Educational Attainment</th>
        @if($showAssignedCompany)
        <th style="width:9%">Assigned / Deployed To</th>
        @endif
        <th style="width:6%">i-PESO Registrant</th>
      </tr>
    </thead>
    <tbody>
      @forelse($rows as $i => $row)
        <tr>
          <td class="c">{{ $i + 1 }}</td>
          <td class="name">{{ $row['name'] }}</td>
          <td class="c">{{ $row['sex'] }}</td>
          <td class="c">{{ $row['civil_status'] }}</td>
          <td class="c">{{ $row['age'] }}</td>
          <td class="c">{{ $row['birth_date'] }}</td>
          <td class="c">{{ $row['date_hired'] }}</td>
          <td>{{ $row['position'] }}</td>
          <td>{{ $row['department'] }}</td>
          <td>{{ $row['address'] }}</td>
          <td>{{ $row['education'] }}</td>
          @if($showAssignedCompany)
          <td>{{ $row['assigned_company'] }}</td>
          @endif
          <td class="c">{{ $row['registered'] ? 'Yes' : 'No' }}</td>
        </tr>
      @empty
        <tr><td colspan="{{ $showAssignedCompany ? 13 : 12 }}" class="c muted" style="padding:10px">No placement records were found in this report.</td></tr>
      @endforelse
    </tbody>
    @if(count($rows) > 0)
    <tfoot>
      <tr>
        <td colspan="{{ $showAssignedCompany ? 13 : 12 }}">
          Total: {{ $summary['total'] }} worker{{ $summary['total'] === 1 ? '' : 's' }}
          &nbsp;&middot;&nbsp; Male: {{ $summary['male'] }}
          &nbsp;&middot;&nbsp; Female: {{ $summary['female'] }}
          @if($summary['unspecified'] > 0)&nbsp;&middot;&nbsp; Sex not specified: {{ $summary['unspecified'] }}@endif
        </td>
      </tr>
    </tfoot>
    @endif
  </table>
@endif

{{-- ── Remarks ── --}}
@if($report->employer_remarks || $report->review_remarks)
  <div class="section-title">IV. Remarks</div>
  <table class="remarks">
    @if($report->employer_remarks)
    <tr><td class="k">Employer</td><td>{{ $report->employer_remarks }}</td></tr>
    @endif
    @if($report->review_remarks)
    <tr><td class="k">PESO Review</td><td>{{ $report->review_remarks }}</td></tr>
    @endif
  </table>
@endif

{{-- ── Certification & signatures (kept together on one page) ── --}}
<div class="closing">
<div class="cert">I hereby certify that the foregoing is a true and correct report of the workers hired by <strong class="gap">{{ $employer['name'] }}</strong> for the period <strong>{{ $coverageLabel }}</strong>, submitted to the Public Employment Service Office of the City of Urdaneta in compliance with its employment monitoring and reporting requirements.</div>

<table class="sigs"><tr>
  <td>
    <div class="sig-label">Submitted by:</div>
    <div class="sig-line"></div>
    <div class="sig-name">{{ $employer['representative'] }}</div>
    <div class="sig-role">{{ $employer['designation'] !== '—' ? $employer['designation'].', ' : '' }}{{ $employer['name'] }}</div>
    <div class="sig-date">Date: {{ $submittedAt }}</div>
  </td>
  <td>
    <div class="sig-label">Reviewed by:</div>
    <div class="sig-line"></div>
    <div class="sig-name">@if($reviewer['signatory']){{ $reviewer['signatory'] }}@else&nbsp;@endif</div>
    <div class="sig-role">PESO Staff, Urdaneta City</div>
    <div class="sig-date">Date: {{ $reviewer['date'] ?: '____________________' }}</div>
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
