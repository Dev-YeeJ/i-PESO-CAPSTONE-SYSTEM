<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:DejaVu Sans,sans-serif;font-size:9px;color:#111827}
h1{text-align:center;font-size:15px;margin:0}
.sub{text-align:center;margin:2px 0 10px;font-size:10px}
.muted{color:#475569}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #64748b;padding:4px 5px;vertical-align:top}
th{background:#e2e8f0;font-size:8px;text-transform:uppercase}
.num{text-align:center}
.sec{background:#f1f5f9;font-weight:bold}
.sign td{border:none;padding-top:26px;width:33%;text-align:center;font-size:9px}
.sign .line{border-top:1px solid #111827;padding-top:3px}
</style></head><body>
@php
  $v = fn($k, $d = 0) => data_get($data, $k, $d);
@endphp
<h1>STATISTICAL PERFORMANCE REPORTING SYSTEM (SPRS)</h1>
<div class="sub">PESO Monthly Operations Statistical Report &mdash; <strong>{{ $v('period', $report->title) }}</strong></div>

<table>
  <thead>
    <tr>
      <th rowspan="2" style="width:38%">Success Indicator</th>
      <th colspan="2">Previous Month<br>{{ $v('previous_period','') }}</th>
      <th colspan="2">Current Month<br>{{ $v('period','') }}</th>
      <th colspan="2">Cumulative (Jan&ndash;{{ $v('period','') }})</th>
    </tr>
    <tr><th class="num">Total</th><th class="num">Female</th><th class="num">Total</th><th class="num">Female</th><th class="num">Total</th><th class="num">Female</th></tr>
  </thead>
  <tbody>
    <tr class="sec"><td colspan="7">I. Public Employment Services through PESO</td></tr>

    <tr><td>1.1 Job vacancies solicited/reported</td>
      <td class="num">{{ $v('1_1_vacancies.previous_total') }}</td><td class="num">&ndash;</td>
      <td class="num">{{ $v('1_1_vacancies.total') }}</td><td class="num">&ndash;</td>
      <td class="num">{{ $v('1_1_vacancies.cumulative_total') }}</td><td class="num">&ndash;</td></tr>

    <tr><td>1.2 Job applicants registered</td>
      <td class="num">{{ $v('1_2_registered.previous_total') }}</td><td class="num">{{ $v('1_2_registered.previous_female') }}</td>
      <td class="num">{{ $v('1_2_registered.total') }}</td><td class="num">{{ $v('1_2_registered.female') }}</td>
      <td class="num">{{ $v('1_2_registered.cumulative_total') }}</td><td class="num">{{ $v('1_2_registered.cumulative_female') }}</td></tr>

    <tr><td>1.3 Job applicants referred</td>
      <td class="num">{{ $v('1_3_referred.previous_total') }}</td><td class="num">{{ $v('1_3_referred.previous_female') }}</td>
      <td class="num">{{ $v('1_3_referred.total') }}</td><td class="num">{{ $v('1_3_referred.female') }}</td>
      <td class="num">{{ $v('1_3_referred.cumulative_total') }}</td><td class="num">{{ $v('1_3_referred.cumulative_female') }}</td></tr>

    <tr><td>1.4 Job applicants placed <span class="muted">(incl. {{ $v('1_4_placed.employer_reported') }} employer-reported)</span></td>
      <td class="num">{{ $v('1_4_placed.previous_total') }}</td><td class="num">{{ $v('1_4_placed.previous_female') }}</td>
      <td class="num">{{ $v('1_4_placed.total') }}</td><td class="num">{{ $v('1_4_placed.female') }}</td>
      <td class="num">{{ $v('1_4_placed.cumulative_total') }}</td><td class="num">{{ $v('1_4_placed.cumulative_female') }}</td></tr>
    <tr><td class="muted" style="padding-left:16px">&nbsp;&nbsp;1.4.1 Private sector / 1.4.2 Government</td>
      <td class="num" colspan="2">&ndash;</td>
      <td class="num" colspan="2">{{ $v('1_4_placed.private') }} / {{ $v('1_4_placed.government') }}</td>
      <td class="num" colspan="2">&ndash;</td></tr>

    <tr><td>1.5 SPES youth beneficiaries placed</td>
      <td class="num">{{ $v('1_5_spes.previous_total') }}</td><td class="num">&ndash;</td>
      <td class="num">{{ $v('1_5_spes.total') }}</td><td class="num">{{ $v('1_5_spes.female') }}</td>
      <td class="num">{{ $v('1_5_spes.cumulative_total') }}</td><td class="num">&ndash;</td></tr>

    <tr><td>1.6 Job fairs conducted</td>
      <td class="num">{{ $v('1_6_job_fairs.previous_fairs_conducted') }}</td><td class="num">&ndash;</td>
      <td class="num">{{ $v('1_6_job_fairs.fairs_conducted') }}</td><td class="num">&ndash;</td>
      <td class="num">{{ $v('1_6_job_fairs.cumulative_fairs_conducted') }}</td><td class="num">&ndash;</td></tr>
    <tr><td class="muted" style="padding-left:16px">&nbsp;&nbsp;1.6.4 Establishments participated / 1.6.7 HOTS</td>
      <td class="num" colspan="2">&ndash;</td>
      <td class="num" colspan="2">{{ $v('1_6_job_fairs.participating_companies') }} / {{ $v('1_6_job_fairs.hots') }}</td>
      <td class="num" colspan="2">&ndash;</td></tr>

    <tr class="sec"><td colspan="7">PhilJobnet / PEIS</td></tr>
    <tr><td>Establishments registered</td>
      <td class="num" colspan="2">&ndash;</td>
      <td class="num" colspan="2">{{ $v('peis.establishments') }}</td>
      <td class="num" colspan="2">{{ $v('peis.cumulative_establishments') }}</td></tr>

    @if(!empty($manualAdjustments))
      <tr class="sec"><td colspan="7">Manually-encoded indicators (LMI / Career Guidance / AIR-TIP)</td></tr>
      @foreach($manualAdjustments as $row)
        <tr><td>{{ $row['label'] ?? $row['indicator_key'] }}</td>
          <td class="num" colspan="2">&ndash;</td>
          <td class="num">{{ $row['total'] ?? 0 }}</td><td class="num">{{ $row['female'] ?? 0 }}</td>
          <td class="num" colspan="2">&ndash;</td></tr>
      @endforeach
    @endif
  </tbody>
</table>

<table class="sign"><tr>
  <td><div class="line">{{ data_get($signatories, 'prepared_by.name', '________________') }}<br><span class="muted">Prepared by{{ data_get($signatories,'prepared_by.position') ? ' — '.$signatories['prepared_by']['position'] : ' (SLEO/PESO Coordinator)' }}</span></div></td>
  <td><div class="line">{{ data_get($signatories, 'checked_by.name', '________________') }}<br><span class="muted">Checked by{{ data_get($signatories,'checked_by.position') ? ' — '.$signatories['checked_by']['position'] : ' (PESO Manager)' }}</span></div></td>
  <td><div class="line">{{ data_get($signatories, 'approved_by.name', '________________') }}<br><span class="muted">Approved by{{ data_get($signatories,'approved_by.position') ? ' — '.$signatories['approved_by']['position'] : ' (City Mayor)' }}</span></div></td>
</tr></table>

<p class="muted" style="margin-top:14px">Generated by i-PESO. Auto-computed indicators are derived from live system data; LMI, Career Guidance, and AIR-TIP rows are manually encoded pending DOLE-confirmed definitions.</p>
</body></html>
