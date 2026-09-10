<!doctype html><html><head><meta charset="utf-8"><style>
@page { margin: 14px 16px; }
body{font-family:'DejaVu Sans',sans-serif;font-size:8.2px;color:#0f172a}
h1{text-align:center;font-size:15px;margin:0;letter-spacing:.5px}
.code{text-align:center;font-weight:bold;margin:2px 0 10px;font-size:10px}
table{width:100%;border-collapse:collapse}
.page{page-break-after:always}
.page:last-child{page-break-after:auto}
.header-row td{vertical-align:top;padding:0}
.meta-block .row{margin-bottom:2px}
.meta-block .label{display:inline-block;min-width:150px;font-size:7px;font-weight:bold;text-transform:uppercase;color:#475569;letter-spacing:.3px}
.meta-block .value{font-size:8.4px;font-weight:bold}
.grid th,.grid td{border:1px solid #64748b;padding:2.5px 3px;vertical-align:middle;text-align:center}
.grid thead th{background:#e2e8f0;font-size:6.6px;font-weight:bold;line-height:1.2}
.grid td.name,.grid td.position{text-align:left;font-size:7.6px}
.grid td.num{font-size:7px}
.grid tbody tr{height:16px}
.check{font-weight:bold;font-size:9px}
.footer{margin-top:8px;width:100%}
.footer td{vertical-align:top;padding:0 6px 0 0}
.legend-box{border:1px solid #64748b;padding:5px 7px;margin-bottom:6px}
.legend-title{font-weight:bold;font-size:7.4px;text-transform:uppercase;margin-bottom:2px;display:block}
.legend-box ol,.legend-box ul{margin:0;padding-left:12px}
.legend-box li{font-size:6.8px;line-height:1.35}
.tally{border:1px solid #64748b;padding:6px}
.tally table td{border:none;padding:1.5px 0;font-size:8px}
.tally table td.tnum{text-align:right;font-weight:bold}
.tally .ttotal{border-top:1px solid #64748b;font-weight:bold}
.submitted{font-size:7.6px}
.sig-line{display:block;border-bottom:1px solid #0f172a;width:230px;height:22px}
.muted{color:#64748b}
.page-of{font-weight:normal;font-size:8px}
.letterhead{border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:6px}
.letterhead td{vertical-align:middle;padding:0}
.letterhead img{width:52px;height:52px}
</style></head><body>

@php
  // The physical RO1-JF Form 3 pre-prints exactly 15 numbered rows per page,
  // so a continuation sheet re-starts at row "1" rather than counting up —
  // chunk the register the same way and always pad the last chunk to 15.
  $pages = $report->entries->chunk(15);
  if ($pages->isEmpty()) {
      $pages = collect([collect()]);
  }
  $pages = $pages->values();
  $totalPages = $pages->count();
@endphp

@foreach($pages as $pageIndex => $pageEntries)
  <div class="page">
    <table class="letterhead"><tr>
      <td style="width:52px"><img src="{{ public_path('images/peso-urdaneta-seal.jpg') }}" alt=""></td>
      <td style="text-align:center">
        <h1>ESTABLISHMENT REPORT</h1>
        <div class="code">RO1-JF Form 3 @if($totalPages > 1)<span class="page-of">&nbsp;&nbsp;·&nbsp;&nbsp;Page {{ $pageIndex + 1 }} of {{ $totalPages }}</span>@endif</div>
      </td>
      <td style="width:52px;text-align:right"><img src="{{ public_path('images/urdaneta-city-seal.jpg') }}" alt=""></td>
    </tr></table>

    <table class="header-row"><tr>
      <td style="width:46%">
        <div class="submitted">
          <strong>Submitted by:</strong>
          <span class="sig-line"></span>
          <div>{{ $submittedByName ?: 'N/A' }}</div>
          <div class="muted">Signature over printed name</div>
          <div style="margin-top:5px"><strong>E-mail Address and Mobile no.:</strong></div>
          <div>{{ $submittedByEmail ?: 'N/A' }}{{ $report->contact_number ? ' / '.$report->contact_number : '' }}</div>
        </div>
      </td>
      <td style="width:54%">
        <div class="meta-block">
          <div class="row"><span class="label">Name of Establishment:</span> <span class="value">{{ $report->company_name }}</span></div>
          <div class="row"><span class="label">Office Location:</span> <span class="value">{{ $report->office_location ?: 'N/A' }}</span></div>
          <div class="row"><span class="label">Date of Activity:</span> <span class="value">{{ optional($report->jobFair->start_date ?? $report->jobFair->event_date)->format('m/d/y') }}</span></div>
          <div class="row"><span class="label">Job Fair Clearance No.:</span> <span class="value">{{ $report->clearance_no ?: '—' }}</span></div>
          <div class="row"><span class="label">Job Fair Venue / Name of Job Fair Platform:</span> <span class="value">{{ $report->jobFair->title }} · {{ $report->jobFair->venue }}</span></div>
        </div>
      </td>
    </tr></table>

    <table class="grid" style="margin-top:10px">
      <thead>
        <tr>
          <th rowspan="2" style="width:2%">#</th>
          <th rowspan="2" style="width:11%">Name of Jobseeker</th>
          <th rowspan="2" style="width:9%">Position Applying For</th>
          <th rowspan="2" style="width:3%">Sex<br>M/F</th>
          <th rowspan="2" style="width:9%">City/Municipality of Residence</th>
          <th rowspan="2" style="width:7%">Tel/Cell Phone No.</th>
          <th rowspan="2" style="width:8%">Jobseeker Classification<br><span class="muted">(refer to code below)</span></th>
          <th rowspan="2" style="width:4%">Age Group</th>
          <th colspan="6">Highest Educational Attainment</th>
          <th colspan="5">Status of Application<br><span class="muted">(please check only one)</span></th>
          <th colspan="2">Reason for Job Mismatch<br><span class="muted">(refer to code below)</span></th>
        </tr>
        <tr>
          <th style="width:2.2%">E</th><th style="width:2.2%">HS</th><th style="width:2.2%">K-12</th>
          <th style="width:2.2%">V</th><th style="width:2.2%">C</th><th style="width:2.2%">PG</th>
          <th style="width:4%">Qualified</th><th style="width:4%">Near<br>Hired</th><th style="width:4%">Hired-on-<br>the-spot</th>
          <th style="width:4.5%">Mismatch ch.<br>(Employer)</th><th style="width:4.5%">Mismatch ch.<br>(Job Seeker)</th>
          <th style="width:3%">Employer</th><th style="width:3%">Job Seeker</th>
        </tr>
      </thead>
      <tbody>
        @for($row = 0; $row < 15; $row++)
          @php $entry = $pageEntries->get($row); @endphp
          @if($entry)
            @php
              $educCode = match(true) {
                str_contains(strtolower($entry->highest_education ?? ''), 'post') => 'PG',
                str_contains(strtolower($entry->highest_education ?? ''), 'college') => 'C',
                str_contains(strtolower($entry->highest_education ?? ''), 'vocational') => 'V',
                str_contains(strtolower($entry->highest_education ?? ''), 'senior') => 'K-12',
                $entry->highest_education === 'high_school' => 'HS',
                $entry->highest_education === 'elementary' => 'E',
                default => null,
              };
              $classifications = collect($entry->classification_codes ?? []);
            @endphp
            <tr>
              <td class="num">{{ $row + 1 }}</td>
              <td class="name">{{ $entry->applicant_name }}</td>
              <td class="position">{{ $entry->position_applied_for }}</td>
              <td>{{ strtoupper(substr($entry->gender, 0, 1)) }}</td>
              <td class="num">{{ $entry->city_municipality ?: '—' }}</td>
              <td class="num">{{ $entry->contact_number ?: '—' }}</td>
              <td class="num">{{ $classifications->isNotEmpty() ? $classifications->join(', ') : '—' }}</td>
              <td>{{ $entry->age_group ?: '—' }}</td>
              <td class="check">{{ $educCode === 'E' ? '✓' : '' }}</td>
              <td class="check">{{ $educCode === 'HS' ? '✓' : '' }}</td>
              <td class="check">{{ $educCode === 'K-12' ? '✓' : '' }}</td>
              <td class="check">{{ $educCode === 'V' ? '✓' : '' }}</td>
              <td class="check">{{ $educCode === 'C' ? '✓' : '' }}</td>
              <td class="check">{{ $educCode === 'PG' ? '✓' : '' }}</td>
              <td class="check">{{ $entry->status === 'qualified' ? '✓' : '' }}</td>
              <td class="check">{{ $entry->status === 'near_hired' ? '✓' : '' }}</td>
              <td class="check">{{ $entry->status === 'hots' ? '✓' : '' }}</td>
              <td class="check">{{ $entry->status === 'employer_mismatch' ? '✓' : '' }}</td>
              <td class="check">{{ $entry->status === 'seeker_mismatch' ? '✓' : '' }}</td>
              <td class="num">{{ $entry->status === 'employer_mismatch' ? $entry->mismatch_code : '—' }}</td>
              <td class="num">{{ $entry->status === 'seeker_mismatch' ? $entry->mismatch_code : '—' }}</td>
            </tr>
          @else
            <tr>
              <td class="num">{{ $row + 1 }}</td>
              <td colspan="20">&nbsp;</td>
            </tr>
          @endif
        @endfor
      </tbody>
    </table>

    @if($pageIndex === $totalPages - 1)
      <table class="footer"><tr>
        <td style="width:64%">
          <div class="legend-box">
            <span class="legend-title">Classification of Jobseekers</span>
            <ol>
              @foreach(\App\Services\JobFairReportService::CLASSIFICATION_CODES as $code => $label)
                <li>({{ $code }}) {{ $label }}</li>
              @endforeach
            </ol>
          </div>
          <table style="width:100%"><tr>
            <td style="width:50%;padding-right:6px">
              <div class="legend-box">
                <span class="legend-title">Employer Mismatch</span>
                <ol>
                  @foreach(\App\Services\JobFairReportService::EMPLOYER_MISMATCH_CODES as $code => $label)
                    <li>({{ $code }}) {{ $label }}</li>
                  @endforeach
                </ol>
              </div>
            </td>
            <td style="width:50%">
              <div class="legend-box">
                <span class="legend-title">Job Seeker Mismatch <span class="muted">(reason for unqualified/job mismatched application)</span></span>
                <ol type="A">
                  @foreach(\App\Services\JobFairReportService::SEEKER_MISMATCH_CODES as $code => $label)
                    <li>({{ $code }}) {{ $label }}</li>
                  @endforeach
                </ol>
              </div>
            </td>
          </tr></table>
          <div class="legend-box">
            <span class="legend-title">Age Group / Education Codes</span>
            <span class="muted">Age Group — A: 15-24 yrs · B: 25-34 yrs · C: 35-44 yrs · D: 45-54 yrs · E: 55-64 yrs · F: 65+ yrs</span><br>
            <span class="muted">Education — E: Elementary · HS: Old High School · K-12: Senior High School · V: Vocational · C: College (Graduate, put a check in the box if completed) · PG: Post Graduate</span>
          </div>
        </td>
        <td style="width:36%">
          <div class="tally">
            <span class="legend-title">Applicant Tally</span>
            <table>
              <tr><td>Male</td><td class="tnum">{{ $report->total_male }}</td></tr>
              <tr><td>Female</td><td class="tnum">{{ $report->total_female }}</td></tr>
              <tr class="ttotal"><td>Total</td><td class="tnum">{{ $report->total_applicants }}</td></tr>
            </table>
            <table style="margin-top:6px">
              <tr><td>Qualified</td><td class="tnum">{{ $report->total_qualified }}</td></tr>
              <tr><td>Near Hired</td><td class="tnum">{{ $report->total_near_hired }}</td></tr>
              <tr><td>Hired-on-the-spot</td><td class="tnum">{{ $report->total_hots }}</td></tr>
              <tr><td>Mismatched</td><td class="tnum">{{ $report->total_rejected }}</td></tr>
            </table>
            <table style="margin-top:6px">
              <tr><td>Vacancies Solicited</td><td class="tnum">{{ $report->total_vacancies_solicited }}</td></tr>
              <tr><td>Vacancies Offered</td><td class="tnum">{{ $report->total_vacancies_offered }}</td></tr>
            </table>
          </div>
          @if($report->mismatchTallies->isNotEmpty())
            <div class="tally" style="margin-top:6px">
              <span class="legend-title">Mismatch Breakdown</span>
              <table>
                @foreach($report->mismatchTallies as $tally)
                  <tr><td>Code {{ $tally->mismatch_code }}</td><td class="tnum">{{ $tally->count }}</td></tr>
                @endforeach
              </table>
            </div>
          @endif
          @if($report->remarks)
            <div class="legend-box" style="margin-top:6px"><span class="legend-title">Remarks</span>{{ $report->remarks }}</div>
          @endif
        </td>
      </tr></table>

      <p class="muted" style="margin-top:6px">Generated by i-PESO using post-event omnichannel reporting. Physical job fair operations remain outside the system.</p>
    @endif
  </div>
@endforeach
</body></html>
