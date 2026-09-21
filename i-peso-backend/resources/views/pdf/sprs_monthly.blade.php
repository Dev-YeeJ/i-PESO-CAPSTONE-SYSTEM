<style>
@page { margin: 15px 25px; }
body{font-family:Helvetica,Arial,sans-serif;font-size:7px;color:#111827;line-height:1.1;}
.formno{text-align:right;font-size:7px;font-style:italic;margin-bottom:2px;font-weight:bold;}
table{width:100%;border-collapse:collapse;border:1.5px solid #111827;}
th,td{border:1px solid #111827;padding:1px 3px;vertical-align:top;}
th{background:#b8d1f3;font-size:6.5px;text-transform:uppercase;text-align:center;vertical-align:middle;}
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
      <th colspan="3" style="text-align:left; background: #ffffff; text-transform:none; font-size:8px; font-weight:normal; padding: 4px 6px;">
        <span style="font-weight:bold;">LGU/PESO:</span> {{ $v('lgu_name', 'Urdaneta City') }}<br>
        <span style="font-weight:bold;">Province:</span> <span style="text-transform:uppercase;">{{ $v('province', 'Pangasinan') }}</span>
      </th>
      <th colspan="5" style="text-align:center; background: #ffffff; text-transform:none; font-size:9px; font-weight:bold; padding: 4px 6px;">
        DEPARTMENT OF LABOR AND EMPLOYMENT<br>
        <span style="font-size:8px; font-weight:normal;">Regional Office No. 1</span><br>
        <span style="font-size:8px; font-weight:normal;">San Fernando City, La Union</span><br>
        STATISTICAL PERFORMANCE REPORTING SYSTEM (SPRS)<br>
        <span style="font-size:7px;">PESO MONTHLY OPERATIONS STATISTICAL REPORT (PESO OpS)</span>
      </th>
      <th colspan="2" style="text-align:center; background: #ffffff; text-transform:none; font-size:8px; padding: 4px 6px; vertical-align:middle;">
        <span style="font-weight:bold;">{{ $v('period_short', $v('period', $report->title)) }}</span><br>
        Reference<br>Month/Year
      </th>
    </tr>

    <!-- Header Row 2 -->
    <tr>
      <th rowspan="3" colspan="2" style="width:16%">PROGRAMS</th>
      <th rowspan="3" style="width:26%">SUCCESS INDICATORS</th>
      <th rowspan="3" style="width:7%">WHOLE<br>YEAR<br>TARGET</th>
      <th rowspan="2" colspan="2">PREVIOUS<br>REPORTING<br>MONTH</th>
      <th colspan="4" style="border-bottom: 1px solid #111827;">Actual Performance</th>
    </tr>
    <!-- Header Row 3 -->
    <tr>
      <th colspan="2">CURRENT<br>REPORTING<br>MONTH</th>
      <th colspan="2">CUMULATIVE<br><span style="text-transform:none; font-size:5.5px;">(Jan to current<br>reporting month)</span></th>
    </tr>
    <!-- Header Row 4 -->
    <tr>
      <th class="num" style="width:8.5%">Total</th><th class="num" style="width:8.5%">Female</th>
      <th class="num" style="width:8.5%">Total</th><th class="num" style="width:8.5%">Female</th>
      <th class="num" style="width:8.5%">Total</th><th class="num" style="width:8.5%">Female</th>
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
    @foreach($rows as $row)
      @if($row['section'] ?? false)
        @if($row['key'] === 'sec_efcbs')
          <tr style="background:#e2e8f0;">
            <td colspan="3" style="font-weight:bold; text-transform:uppercase;">{{ $row['label'] }}</td>
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
          $pad = 2 + (($row['indent'] ?? 0) * 8); 
        @endphp
        <tr>
          <td></td>
          <td></td>
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

    <!-- Other Accomplishments -->
    <tr style="background:#e2e8f0;">
      <td colspan="10" style="font-weight:bold;text-transform:uppercase">OTHER ACCOMPLISHMENTS:</td>
    </tr>
    <tr>
      <td colspan="3" style="text-transform:uppercase; font-size:6.5px;">FIRST TIME JOBSEEKER ACT (Attachment Included)</td>
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
            <td style="width: 33.33%; border: none; border-right: 1px solid #111827; padding: 4px 10px;">
              <div style="font-weight: bold; text-align: center; margin-bottom: 12px;">PREPARED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 30%; border: none; padding: 1px;">NAME:</td>
                  <td style="width: 70%; border: none; border-bottom: 1px solid #111827; text-align: center; padding: 1px;">{{ data_get($signatories, 'prepared_by.name', '') }}</td>
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
                  <td style="border: none; border-bottom: 1px solid #111827; padding: 1px;"></td>
                </tr>
              </table>
            </td>
            
            <td style="width: 33.33%; border: none; border-right: 1px solid #111827; padding: 4px 10px;">
              <div style="font-weight: bold; text-align: center; margin-bottom: 12px;">CHECKED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="border: none; padding: 1px; text-align: center; border-bottom: 1px solid #111827; min-height: 10px;">{{ data_get($signatories, 'checked_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px; text-align: center; color: white;">.</td>
                </tr>
                <tr>
                  <td style="border: none; text-align: center; padding: 2px;">CGADH1/PESO Manager</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px; text-align: center; color: white;">.</td>
                </tr>
              </table>
            </td>
            
            <td style="width: 33.33%; border: none; padding: 4px 10px;">
              <div style="font-weight: bold; text-align: center; margin-bottom: 12px;">APPROVED BY:</div>
              <table style="width: 100%; border: none;">
                <tr>
                  <td style="width: 30%; border: none; padding: 1px; color: white;">NAME:</td>
                  <td style="width: 70%; border: none; border-bottom: 1px solid #111827; text-align: center; padding: 1px;">{{ data_get($signatories, 'approved_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px; color: white;">SIGNATURE:</td>
                  <td style="border: none; border-bottom: 1px solid #111827; padding: 1px;"></td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; text-align: center; padding: 2px;">City Mayor</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px; color: white;">DATE:</td>
                  <td style="border: none; border-bottom: 1px solid #111827; padding: 1px;"></td>
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
