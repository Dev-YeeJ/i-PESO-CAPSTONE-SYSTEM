<style>
body{font-family:DejaVu Sans,sans-serif;font-size:8.5px;color:#111827}
h1{text-align:center;font-size:14px;margin:0}
.sub{text-align:center;margin:2px 0 10px;font-size:10px}
.muted{color:#475569}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #111827;padding:3px 5px;vertical-align:top}
th{background:#e2e8f0;font-size:7.5px;text-transform:uppercase;text-align:center;}
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
.letterhead .ref .box{display:inline-block;border:1px solid #111827;padding:4px 10px;font-weight:bold;margin-top:2px}
.formno{text-align:right;font-size:7.5px;font-style:italic;margin-bottom:2px;font-weight:bold;}
.dgray { background: #6b7280 !important; }
</style></head><body>
@php
  $v = fn($k, $d = null) => data_get($data, $k, $d);
  $rows = $data['rows'] ?? [];
  $cell = fn($value) => $value === null || $value === '' ? '0' : e($value);

  $noFemaleKeys = [
      '1_1', '1_1_1', '1_1_2',
      '1_6', '1_6_1', '1_6_2', '1_6_3',
      '1_6_4', '1_6_4_1', '1_6_4_2',
      '1_6_5', '1_6_5_1', '1_6_5_2',
      'lmi_1', 'lmi_1_1', 'lmi_1_1_1', 'lmi_1_1_2', 'lmi_1_1_3', 'lmi_1_1_4', 'lmi_1_2', 'lmi_1_2_1', 'lmi_1_2_2',
      'cg_1', 'cg_1_1', 'cg_1_2',
      'peis_1'
  ];
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
      <th rowspan="2" colspan="2" style="width:26%">PROGRAMS</th>
      <th rowspan="2" style="width:25%">SUCCESS INDICATORS</th>
      <th rowspan="2" style="width:7%">WHOLE<br>YEAR<br>TARGET</th>
      <th colspan="2">PREVIOUS<br>REPORTING<br>MONTH</th>
      <th colspan="2">CURRENT<br>REPORTING<br>MONTH</th>
      <th colspan="2">CUMULATIVE<br>(Jan to current<br>reporting month)</th>
    </tr>
    <tr>
      <th class="num" style="width:7%">Total</th><th class="num" style="width:7%">Female</th>
      <th class="num" style="width:7%">Total</th><th class="num" style="width:7%">Female</th>
      <th class="num" style="width:7%">Total</th><th class="num" style="width:7%">Female</th>
    </tr>
    <tr>
      <th class="num">(1)</th>
      <th class="num">(2)</th>
      <th class="num">(3)</th>
      <th class="num">(4)</th>
      <th class="num">(5)</th>
      <th class="num">(6)</th>
      <th class="num">(7)</th>
      <th class="num">(8)</th>
      <th class="num">(9)</th>
      <th class="num">(10)</th>
    </tr>
  </thead>
  <tbody>
    @if(empty($rows))
      <tr><td colspan="10" class="muted">This report was generated before the full-form layout was added. Regenerate it to see every indicator line.</td></tr>
    @endif
    @foreach($rows as $row)
      @if($row['section'] ?? false)
        @if($row['key'] === 'sec_efcbs')
          <tr>
            <td colspan="3" style="font-weight:bold;">{{ $row['label'] }}</td>
            <td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
          </tr>
        @elseif(in_array($row['key'], ['sec_jsap', 'sec_lmi', 'sec_cg', 'sec_airtip', 'sec_peis']))
          <tr>
            <td style="font-weight:bold;">{{ $row['label'] }}</td>
            <td></td>
            <td></td>
            <td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
          </tr>
        @elseif($row['key'] === 'sec_pes')
          <tr>
            <td></td>
            <td style="font-weight:bold;">{{ $row['label'] }}</td>
            <td></td>
            <td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
          </tr>
        @endif
      @else
        @php 
          $pad = 2 + (($row['indent'] ?? 0) * 10); 
          $isNoFemale = in_array($row['key'], $noFemaleKeys);
          $hasTarget = strlen(trim($row['target'] ?? '')) > 0 || (isset($row['target']) && $row['target'] !== null);
          // Only show target if it has a value, or for main indicators we might want to default to 0. 
          // Let's just use what's passed, or dark gray if no target applies. 
          // Actually, in the DB, targets might just be 0 for everything, so we display it.
          // In DOLE form, targets are only on top-level indicators. Let's make target dark gray for sub-indicators.
          $isSubIndicator = ($row['indent'] ?? 0) > 1;
        @endphp
        <tr>
          <td></td>
          <td></td>
          <td style="padding-left:{{ $pad }}px">{{ $row['label'] }}</td>
          @if($isSubIndicator)
            <td class="dgray"></td>
          @else
            <td class="num">{!! $cell($row['target'] ?? null) !!}</td>
          @endif
          
          <td class="num">{!! $cell($row['prev_total'] ?? null) !!}</td>
          @if($isNoFemale)
            <td class="dgray"></td>
          @else
            <td class="num">{!! $cell($row['prev_female'] ?? null) !!}</td>
          @endif
          
          <td class="num">{!! $cell($row['curr_total'] ?? null) !!}</td>
          @if($isNoFemale)
            <td class="dgray"></td>
          @else
            <td class="num">{!! $cell($row['curr_female'] ?? null) !!}</td>
          @endif
          
          <td class="num">{!! $cell($row['cum_total'] ?? null) !!}</td>
          @if($isNoFemale)
            <td class="dgray"></td>
          @else
            <td class="num">{!! $cell($row['cum_female'] ?? null) !!}</td>
          @endif
        </tr>
      @endif
    @endforeach
  </tbody>
</table>

<table style="margin-top:10px">
  <tbody>
    <tr>
      <td colspan="10" style="background:#cbd5e1;font-weight:bold;text-transform:uppercase">OTHER ACCOMPLISHMENTS</td>
    </tr>
    <tr>
      <td colspan="3">First Time Jobseeker Act (RA 11261) <span class="muted">(Attachment Included: {!! $cell($v('other_accomplishments.ftja_with_attachment')) !!})</span></td>
      <td class="dgray"></td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.previous_ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.cumulative_ftja_total')) !!}</td>
    </tr>
  </tbody>
</table>

<table style="margin-top:10px; border: 2px solid #111827;">
  <tbody>
    <tr><td style="border:none; padding: 5px; font-weight: bold;" colspan="3">ISSUES / CONCERNS: (Indicate the issues and/or concerns that were encountered by the PESO in the delivery/provision of services, particularly those needing immediate action.)</td></tr>
    <tr><td style="border:none; border-bottom: 2px solid #111827; padding: 5px; white-space:pre-wrap; min-height: 40px;" colspan="3">{!! $cell($v('issues_concerns')) !!}</td></tr>
    <tr>
      <td style="border:none; border-right: 2px solid #111827; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">PREPARED BY:</div>
        <div style="margin-bottom: 10px; margin-top: 30px;">
          <div style="width: 200px; border-bottom: 1px solid #000; text-align: center; margin: 0 auto; min-height: 12px;">{{ data_get($signatories, 'prepared_by.name', '') }}</div>
          <div style="text-align: center; font-size: 8px;">NAME / SIGNATURE</div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 200px; text-align: center; margin: 0 auto; min-height: 12px; font-weight: bold;">SLEO / PESO Coordinator</div>
          <div style="text-align: center; font-size: 8px;">POSITION</div>
        </div>
        <div style="margin-bottom: 5px; text-align: center;">
           <span style="display:inline-block; width: 150px; border-bottom: 1px solid #000;"></span>
           <div style="text-align: center; font-size: 8px;">DATE</div>
        </div>
      </td>
      <td style="border:none; border-right: 2px solid #111827; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">CHECKED BY:</div>
        <div style="margin-bottom: 10px; margin-top: 30px;">
          <div style="width: 200px; border-bottom: 1px solid #000; text-align: center; margin: 0 auto; min-height: 12px;">{{ data_get($signatories, 'checked_by.name', '') }}</div>
          <div style="text-align: center; font-size: 8px;">NAME / SIGNATURE</div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 200px; text-align: center; margin: 0 auto; min-height: 12px; font-weight: bold;">CGADH1 / PESO Manager</div>
          <div style="text-align: center; font-size: 8px;">POSITION</div>
        </div>
        <div style="margin-bottom: 5px; text-align: center;">
           <span style="display:inline-block; width: 150px; border-bottom: 1px solid #000;"></span>
           <div style="text-align: center; font-size: 8px;">DATE</div>
        </div>
      </td>
      <td style="border:none; padding: 10px; width: 33.33%; vertical-align: top;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">APPROVED BY:</div>
        <div style="margin-bottom: 10px; margin-top: 30px;">
          <div style="width: 200px; border-bottom: 1px solid #000; text-align: center; margin: 0 auto; min-height: 12px;">{{ data_get($signatories, 'approved_by.name', '') }}</div>
          <div style="text-align: center; font-size: 8px;">NAME / SIGNATURE</div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 200px; text-align: center; margin: 0 auto; min-height: 12px; font-weight: bold;">City Mayor</div>
          <div style="text-align: center; font-size: 8px;">POSITION</div>
        </div>
        <div style="margin-bottom: 5px; text-align: center;">
           <span style="display:inline-block; width: 150px; border-bottom: 1px solid #000;"></span>
           <div style="text-align: center; font-size: 8px;">DATE</div>
        </div>
      </td>
    </tr>
  </tbody>
</table>

<p class="muted" style="margin-top:14px">Generated by i-PESO. Blank cells (shown grey) are not computed by the system and were left for manual encoding or correction before submission.</p>
</body></html>
