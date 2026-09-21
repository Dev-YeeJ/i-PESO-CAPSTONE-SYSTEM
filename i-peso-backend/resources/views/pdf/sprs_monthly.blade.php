<style>
@page { margin: 15px 20px; }
body{font-family:Helvetica,Arial,sans-serif;font-size:6.5px;color:#111827;line-height:1.1;}
.formno{text-align:right;font-size:6.5px;font-style:italic;margin-bottom:2px;font-weight:bold;}
table{width:100%;border-collapse:collapse;border:1.5px solid #111827;}
th,td{border:1px solid #111827;padding:1px 2px;vertical-align:top;}
th{background:#9bc2e6;font-size:6px;text-transform:uppercase;text-align:center;vertical-align:middle;}
.num{text-align:center}
.muted{color:#475569}
.dgray { background: #ffffff !important; }
.header-table td { border: 1px solid #111827; }
</style></head><body>
@php
  $v = fn($k, $d = null) => data_get($data, $k, $d);
  $rows = $data['rows'] ?? [];
  $cell = fn($value) => $value === null || $value === '' ? '' : e($value);
@endphp
<div class="formno">SPRS Form 2018</div>

<table>
  <thead>
    <!-- Header Row 1 (Letterhead) -->
    <tr>
      <th colspan="2" style="text-align:left; background: #ffffff; text-transform:none; font-size:7.5px; font-weight:normal; padding: 2px 4px;">
        <span style="font-weight:bold;">LGU/PESO:</span> {{ $v('lgu_name', 'Urdaneta City') }}<br>
        <span style="font-weight:bold;">Province:</span> <span style="text-transform:uppercase;">{{ $v('province', 'Pangasinan') }}</span>
      </th>
      <th colspan="6" style="text-align:center; background: #ffffff; text-transform:none; font-size:8.5px; font-weight:bold; padding: 2px 4px;">
        DEPARTMENT OF LABOR AND EMPLOYMENT<br>
        <span style="font-size:7px; font-weight:normal;">Regional Office No. 1</span><br>
        <span style="font-size:7px; font-weight:normal;">San Fernando City, La Union</span><br>
        STATISTICAL PERFORMANCE REPORTING SYSTEM (SPRS)<br>
        <span style="font-size:6.5px;">PESO MONTHLY OPERATIONS STATISTICAL REPORT (PESO OpS)</span>
      </th>
      <th colspan="2" style="text-align:center; background: #ffffff; text-transform:none; font-size:7.5px; padding: 2px 4px; vertical-align:middle;">
        <span style="font-weight:bold;">{{ $v('period_short', $v('period', $report->title)) }}</span><br>
        Reference<br>Month/Year
      </th>
    </tr>

    <!-- Header Row 2 -->
    <tr>
      <th rowspan="3" style="width:5%">PROGRAMS</th>
      <th rowspan="3" style="width:8%"></th>
      <th rowspan="3" style="width:34%">SUCCESS INDICATORS</th>
      <th rowspan="3" style="width:5%">WHOLE<br>YEAR<br>TARGET</th>
      <th rowspan="2" colspan="2">PREVIOUS<br>REPORTING<br>MONTH</th>
      <th colspan="4" style="border-bottom: 1px solid #111827; text-transform:none; font-weight:bold;">Actual Performance</th>
    </tr>
    <!-- Header Row 3 -->
    <tr>
      <th colspan="2">CURRENT<br>REPORTING<br>MONTH</th>
      <th colspan="2">CUMULATIVE<br><span style="text-transform:none; font-size:5px;">(Jan to current<br>reporting month)</span></th>
    </tr>
    <!-- Header Row 4 -->
    <tr>
      <th class="num" style="width:8%">Total</th><th class="num" style="width:8%">Female</th>
      <th class="num" style="width:8%">Total</th><th class="num" style="width:8%">Female</th>
      <th class="num" style="width:8%">Total</th><th class="num" style="width:8%">Female</th>
    </tr>
    <!-- Header Row 5 (Numbers) -->
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
    @php
      $col1 = '';
      $col2 = '';
      
      // Helper to fix title case for specific strings
      $formatLabel = function($label) {
          $label = strtolower($label);
          $label = ucwords($label);
          $label = str_replace(['(pes)', '(lmi)', 'Air-tip', 'Philjobnet/peis', 'Pes'], ['(PES)', '(LMI)', 'AIR-TIP', 'PhilJobnet/PEIS', 'PES'], $label);
          return $label;
      };
    @endphp
    @foreach($rows as $row)
      @if($row['section'] ?? false)
        @if($row['key'] === 'sec_efcbs')
          <tr>
            <td colspan="3" style="font-weight:bold; text-transform:uppercase;">{{ $row['label'] }}</td>
            <td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
            <td class="dgray"></td><td class="dgray"></td>
          </tr>
        @elseif(in_array($row['key'], ['sec_jsap', 'sec_lmi', 'sec_cg', 'sec_airtip', 'sec_peis']))
          @php $col1 = $formatLabel($row['label']); @endphp
        @elseif($row['key'] === 'sec_pes')
          @php $col2 = $formatLabel($row['label']); @endphp
        @endif
      @else
        @php 
          $pad = 1 + (($row['indent'] ?? 0) * 6); 
          
          // Exception: in original DOLE, "1. Public Employment Services through PESO" 
          // does not exist in our DB as an indicator, but we have "1.1 Job vacancies...".
          // If we want it to look EXACTLY like the DOLE, we just print the indicator.
          // The $col1 and $col2 will be printed in the same row as the first indicator in that section!
        @endphp
        <tr>
          <td style="font-weight:bold;">{{ $col1 }}</td>
          <td style="font-weight:bold;">{{ $col2 }}</td>
          <td style="padding-left:{{ $pad }}px">{{ $row['label'] }}</td>
          <td class="num">{!! $cell($row['target'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['prev_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['prev_female'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['curr_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['curr_female'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['cum_total'] ?? null) !!}</td>
          <td class="num">{!! $cell($row['cum_female'] ?? null) !!}</td>
        </tr>
        @php 
          // Clear col1 and col2 so they are only printed once
          $col1 = ''; 
          $col2 = ''; 
        @endphp
      @endif
    @endforeach

    <!-- Other Accomplishments -->
    <tr>
      <td colspan="10" style="font-weight:bold;text-transform:uppercase">OTHER ACCOMPLISHMENTS:</td>
    </tr>
    <tr>
      <td colspan="3" style="text-transform:uppercase; font-size:6px;">FIRST TIME JOBSEEKER ACT (Attachment Included)</td>
      <td class="dgray"></td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.previous_ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.cumulative_ftja_total')) !!}</td>
    </tr>

    <!-- Issues and Concerns -->
    <tr>
      <td colspan="10" style="font-weight: bold; border-bottom: none;">
        ISSUES / CONCERNS: (Indicate the issues and/or concerns that were encountered by the PESO in the delivery/provision of services, particularly those needing immediate action.)
      </td>
    </tr>
    <tr>
      <td colspan="10" style="white-space:pre-wrap; min-height: 20px; border-top: none;">
        {!! $cell($v('issues_concerns')) !!}
      </td>
    </tr>

    <!-- Signatories -->
    <tr>
      <td colspan="10" style="padding: 0;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 33.33%; border: none; padding: 4px 8px;">
              <div style="font-weight: bold; text-align: left; margin-bottom: 8px;">PREPARED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 25%; border: none; padding: 1px;">NAME:</td>
                  <td style="width: 75%; border: none; border-bottom: 1px solid #111827; text-align: center; padding: 1px; font-weight:bold;">{{ data_get($signatories, 'prepared_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px;">SIGNATURE:</td>
                  <td style="border: none; border-bottom: 1px solid #111827; padding: 1px;"></td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; text-align: center; padding: 2px;">SLEO/PESO Coordinator</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px;">DATE:</td>
                  <td style="border: none; padding: 1px;">{{ date('m/d/Y') }}</td>
                </tr>
              </table>
            </td>
            
            <td style="width: 33.33%; border: none; padding: 4px 8px; vertical-align:top;">
              <div style="font-weight: bold; text-align: left; margin-bottom: 8px;">CHECKED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="border: none; padding: 1px; height: 11px;"></td>
                </tr>
                <tr>
                  <td style="border: none; border-bottom: 1px solid #111827; text-align: center; padding: 1px; font-weight:bold;">{{ data_get($signatories, 'checked_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border: none; text-align: center; padding: 2px;">CGADH1/PESO Manager</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px; text-align: left;">DATE: {{ date('m/d/Y') }}</td>
                </tr>
              </table>
            </td>
            
            <td style="width: 33.33%; border: none; padding: 4px 8px;">
              <div style="font-weight: bold; text-align: left; margin-bottom: 8px;">APPROVED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 25%; border: none; padding: 1px;">NAME:</td>
                  <td style="width: 75%; border: none; border-bottom: 1px solid #111827; text-align: center; padding: 1px; font-weight:bold;">{{ data_get($signatories, 'approved_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px;">SIGNATURE:</td>
                  <td style="border: none; border-bottom: 1px solid #111827; padding: 1px;"></td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; text-align: center; padding: 2px;">City Mayor</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px;">DATE:</td>
                  <td style="border: none; padding: 1px;"></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body></html>
