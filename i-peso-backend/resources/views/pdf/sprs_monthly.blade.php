<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:DejaVu Sans,sans-serif;font-size:8.5px;color:#111827}
h1{text-align:center;font-size:14px;margin:0}
.sub{text-align:center;margin:2px 0 10px;font-size:10px}
.muted{color:#475569}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #64748b;padding:3px 5px;vertical-align:top}
th{background:#e2e8f0;font-size:7.5px;text-transform:uppercase}
.num{text-align:center}
.sec{background:#cbd5e1;font-weight:bold;text-transform:uppercase}
.blank{color:#94a3b8}
.sign td{border:none;padding-top:26px;width:33%;text-align:center;font-size:9px}
.sign .line{border-top:1px solid #111827;padding-top:3px}
.letterhead{width:100%;margin-bottom:4px}
.letterhead td{border:none;padding:0;vertical-align:top}
.letterhead .id{font-size:9px;width:28%}
.letterhead .center{text-align:center;width:44%}
.letterhead .ref{width:28%;text-align:right;font-size:9px}
.letterhead .ref .box{display:inline-block;border:1px solid #64748b;padding:4px 10px;font-weight:bold;margin-top:2px}
.formno{text-align:right;font-size:7.5px;font-style:italic;margin-bottom:2px}
</style></head><body>
@php
  $v = fn($k, $d = null) => data_get($data, $k, $d);
  $rows = $data['rows'] ?? [];
  $cell = fn($value) => $value === null || $value === '' ? '0' : e($value);
@endphp
<div class="formno">SPRS Form 2018</div>
<table class="letterhead"><tr>
  <td class="id">
    LGU/PESO: <strong>{{ $v('lgu_name', 'Urdaneta City') }}</strong><br>
    Province: <strong>{{ $v('province', 'Pangasinan') }}</strong>
  </td>
  <td class="center">
    <div style="font-weight:bold">DEPARTMENT OF LABOR AND EMPLOYMENT</div>
    <div>Regional Office No. 1</div>
    <div>San Fernando City, La Union</div>
    <h1 style="margin-top:6px">STATISTICAL PERFORMANCE REPORTING SYSTEM (SPRS)</h1>
    <div class="sub">PESO MONTHLY OPERATIONS STATISTICAL REPORT (PESO OpS)</div>
  </td>
  <td class="ref">
    Reference<br>Month/Year<br>
    <span class="box">{{ $v('period_short', $v('period', $report->title)) }}</span>
  </td>
</tr></table>

<table>
  <thead>
    <tr>
      <th rowspan="2" style="width:34%">Programs / Success Indicators</th>
      <th rowspan="2" style="width:7%">Whole Year Target</th>
      <th colspan="2">Previous Month<br>{{ $v('previous_period','') }}</th>
      <th colspan="2">Current Month<br>{{ $v('period','') }}</th>
      <th colspan="2">Cumulative (Jan&ndash;{{ $v('period','') }})</th>
    </tr>
    <tr>
      <th class="num">Total</th><th class="num">Female</th>
      <th class="num">Total</th><th class="num">Female</th>
      <th class="num">Total</th><th class="num">Female</th>
    </tr>
  </thead>
  <tbody>
    @if(empty($rows))
      <tr><td colspan="8" class="muted">This report was generated before the full-form layout was added. Regenerate it to see every indicator line.</td></tr>
    @endif
    @foreach($rows as $row)
      @if($row['section'] ?? false)
        <tr class="sec"><td colspan="8">{{ $row['label'] }}</td></tr>
      @else
        @php $pad = 8 + (($row['indent'] ?? 0) * 12); @endphp
        <tr>
          <td style="padding-left:{{ $pad }}px">{{ $row['label'] }}</td>
          <td class="num">{!! $cell($row['target'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['prev_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['prev_female'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['curr_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['curr_female'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['cum_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['cum_female'] ?? null) !!}</td>
        </tr>
      @endif
    @endforeach
  </tbody>
</table>

<table style="margin-top:10px">
  <tbody>
    <tr class="sec"><td colspan="8">Other Accomplishments</td></tr>
    <tr>
      <td>First Time Jobseeker Act (RA 11261) <span class="muted">(Attachment Included: {!! $cell($v('other_accomplishments.ftja_with_attachment')) !!})</span></td>
      <td class="num">{!! $cell(null) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.previous_ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.cumulative_ftja_total')) !!}</td>
    </tr>
  </tbody>
</table>

<table style="margin-top:10px; border: 1px solid #111827;">
  <tbody>
    <tr><td style="border:none; padding: 5px; font-weight: bold;" colspan="3">ISSUES / CONCERNS: (Indicate the issues and/or concerns that were encountered by the PESO in the delivery/provision of services, particularly those needing immediate action.)</td></tr>
    <tr><td style="border:none; border-bottom: 1px solid #111827; padding: 5px; white-space:pre-wrap; min-height: 40px;" colspan="3">{!! $cell($v('issues_concerns')) !!}</td></tr>
    <tr>
      <td style="border:none; border-right: 1px solid #111827; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">PREPARED BY:</div>
        <div style="margin-bottom: 10px;">NAME: <span style="display:inline-block; width: 200px; border-bottom: 1px solid #000; text-align: center;">{{ data_get($signatories, 'prepared_by.name', ' ') }}</span></div>
        <div style="margin-bottom: 5px;">SIGNATURE: <span style="display:inline-block; width: 175px; border-bottom: 1px solid #000;"></span></div>
        <div style="text-align: center; margin-bottom: 20px;">SLEO/PESO Coordinator</div>
        <div>DATE: <span style="display:inline-block; width: 150px; border-bottom: 1px solid #000;"></span></div>
      </td>
      <td style="border:none; border-right: 1px solid #111827; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">CHECKED BY:</div>
        <div style="margin-bottom: 10px;"><span style="color:white">NAME:</span> <span style="display:inline-block; width: 200px; text-align: center;">{{ data_get($signatories, 'checked_by.name', ' ') }}</span></div>
        <div style="margin-bottom: 5px;"><span style="color:white">SIGNATURE:</span> <span style="display:inline-block; width: 175px;"></span></div>
        <div style="text-align: center; margin-bottom: 20px; border-top: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto; padding-top: 5px;">CGADH1/PESO Manager</div>
        <div><span style="color:white">DATE:</span> <span style="display:inline-block; width: 150px;"></span></div>
      </td>
      <td style="border:none; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">APPROVED BY:</div>
        <div style="margin-bottom: 10px;">NAME: <span style="display:inline-block; width: 200px; border-bottom: 1px solid #000; text-align: center;">{{ data_get($signatories, 'approved_by.name', ' ') }}</span></div>
        <div style="margin-bottom: 5px;">SIGNATURE: <span style="display:inline-block; width: 175px; border-bottom: 1px solid #000;"></span></div>
        <div style="text-align: center; margin-bottom: 20px;">City Mayor</div>
        <div>DATE: <span style="display:inline-block; width: 150px; border-bottom: 1px solid #000;"></span></div>
      </td>
    </tr>
  </tbody>
</table>

<p class="muted" style="margin-top:14px">Generated by i-PESO. Blank cells (shown grey) are not computed by the system and were left for manual encoding or correction before submission.</p>
</body></html>
