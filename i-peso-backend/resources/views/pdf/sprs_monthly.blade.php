<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page { margin: 14px 18px; }
body{font-family:Helvetica,Arial,sans-serif;font-size:7px;color:#000;line-height:1.12;}
.formno{text-align:right;font-size:7px;font-style:italic;margin-bottom:2px;font-weight:bold;}
table{width:100%;border-collapse:collapse;border:1.2px solid #000;}
th,td{border:0.8px solid #000;padding:1px 3px;vertical-align:top;}
/* The blue band covers only the grouped column headings; the (1)…(10)
   numbering strip beneath it is plain white on the printed form. */
th{background:#9bc2e6;font-size:6.5px;text-transform:uppercase;text-align:center;vertical-align:middle;}
th.plain{background:#fff;text-transform:none;}
.num{text-align:center}
.muted{color:#475569}
/* Cells the form blocks out are shaded on the scanned original. We print them
   white on purpose — the shading is not part of the grid. */
.blocked{background:#fff;}
.ind{height:16px;}
.prog{font-weight:bold;font-size:7px;text-transform:none;}
</style></head><body>
@php
  $v = fn($k, $d = null) => data_get($data, $k, $d);
  $rows = $data['rows'] ?? [];
  $cell = fn($value) => $value === null || $value === '' ? '' : e($value);

  // Restore the form's own capitalisation from the all-caps section labels.
  $fmt = function ($label) {
      $label = ucwords(strtolower($label));
      return str_replace(
          ['(pes)', '(lmi)', 'Air-tip', 'Philjobnet/peis'],
          ['(PES)', '(LMI)', 'AIR-TIP', 'PhilJobnet/PEIS'],
          $label
      );
  };

  // The form's two left-hand columns are merged cells, not per-row cells: one
  // tall "I. Job Search Assistance Program" spanning every indicator, and one
  // lettered sub-program (A-E) spanning its own indicators. Group the flat row
  // list so each can be emitted with the correct rowspan.
  $band = null;
  $programLabel = '';
  $groups = [];
  foreach ($rows as $r) {
      if ($r['section'] ?? false) {
          if ($r['key'] === 'sec_efcbs') {
              $band = $r['label'];
          } elseif ($r['key'] === 'sec_jsap') {
              $programLabel = $fmt($r['label']);
          } else {
              $groups[] = ['label' => $fmt($r['label']), 'rows' => []];
          }
      } elseif ($groups) {
          $groups[count($groups) - 1]['rows'][] = $r;
      }
  }

  // "1. Public Employment Services through PESO" heads the PES block on the
  // form but carries no figures of its own, so it is not in the row data.
  if ($groups) {
      array_unshift($groups[0]['rows'], [
          'label' => '1. Public Employment Services through PESO',
          'indent' => 0, 'heading' => true,
      ]);
  }
  $programSpan = array_sum(array_map(fn ($g) => count($g['rows']), $groups));
@endphp
<div class="formno">SPRS Form 2018</div>

<table>
  <thead>
    <!-- Letterhead -->
    <tr>
      <th colspan="2" class="plain" style="text-align:left; font-size:7.5px; font-weight:normal; padding:3px 4px;">
        <span style="font-weight:bold;">LGU/PESO:</span>{{ $v('lgu_name', 'Urdaneta City') }}<br><br>
        <span style="font-weight:bold;">Province:</span> <span style="text-transform:uppercase;">{{ $v('province', 'Pangasinan') }}</span>
      </th>
      <th colspan="6" class="plain" style="text-align:center; font-size:8.5px; padding:3px 4px;">
        <span style="font-weight:bold; font-size:9.5px;">DEPARTMENT OF LABOR AND EMPLOYMENT</span><br>
        <span style="font-size:7.5px; font-weight:normal;">Regional Office No. 1</span><br>
        <span style="font-size:7.5px; font-weight:normal;">San Fernando City, La Union</span><br><br>
        <span style="font-weight:bold; font-size:8.5px;">STATISTICAL PERFORMANCE REPORTING SYSTEM (SPRS)</span><br>
        <span style="font-weight:bold; font-size:7px;">PESO MONTHLY OPERATIONS STATISTICAL REPORT (PESO OpS)</span>
      </th>
      <th colspan="2" class="plain" style="text-align:center; font-size:7.5px; padding:3px 4px; vertical-align:middle;">
        <span style="font-weight:bold; font-size:9px;">{{ $v('period_short', $v('period', $report->title)) }}</span><br><br>
        <span style="font-weight:bold;">Reference<br>Month/Year</span>
      </th>
    </tr>

    <!-- "Actual Performance" is one band across all six figure columns. -->
    <tr>
      <th colspan="2" rowspan="3" style="width:7.5%">PROGRAMS</th>
      <th rowspan="3" style="width:41.5%">SUCCESS INDICATORS</th>
      <th rowspan="3" style="width:6%">WHOLE<br>YEAR<br>TARGET</th>
      <th colspan="6" style="text-transform:none; font-weight:bold;">Actual Performance</th>
    </tr>
    <tr>
      <th colspan="2">PREVIOUS<br>REPORTING<br>MONTH</th>
      <th colspan="2">CURRENT<br>REPORTING<br>MONTH</th>
      <th colspan="2">CUMULATIVE<br><span style="text-transform:none; font-size:5.5px; font-weight:normal;">(Jan to current<br>reporting month)</span></th>
    </tr>
    <tr>
      <th class="num" style="width:5.66%; text-transform:none;">Total</th><th class="num" style="width:5.66%; text-transform:none;">Female</th>
      <th class="num" style="width:5.66%; text-transform:none;">Total</th><th class="num" style="width:5.66%; text-transform:none;">Female</th>
      <th class="num" style="width:5.66%; text-transform:none;">Total</th><th class="num" style="width:5.67%; text-transform:none;">Female</th>
    </tr>
    <tr>
      <th class="num plain" style="width:7.5%; font-weight:normal;">(1)</th>
      <th class="num plain" style="width:11%; font-weight:normal;">(2)</th>
      <th class="num plain" style="font-weight:normal;">(3)</th>
      <th class="num plain" style="font-weight:normal;">(4)</th>
      <th class="num plain" style="font-weight:normal;">(5)</th>
      <th class="num plain" style="font-weight:normal;">(6)</th>
      <th class="num plain" style="font-weight:normal;">(7)</th>
      <th class="num plain" style="font-weight:normal;">(8)</th>
      <th class="num plain" style="font-weight:normal;">(9)</th>
      <th class="num plain" style="font-weight:normal;">(10)</th>
    </tr>
  </thead>
  <tbody>
    @if(empty($rows))
      <tr><td colspan="10" class="muted">This report was generated before the full-form layout was added. Regenerate it to see every indicator line.</td></tr>
    @endif

    @if($band)
      <tr>
        <td colspan="3" style="font-weight:bold; text-transform:uppercase;">{{ $band }}</td>
        <td class="blocked"></td>
        <td class="blocked"></td><td class="blocked"></td>
        <td class="blocked"></td><td class="blocked"></td>
        <td class="blocked"></td><td class="blocked"></td>
      </tr>
    @endif

    @foreach($groups as $gi => $group)
      @foreach($group['rows'] as $ri => $row)
        @php $pad = 3 + (($row['indent'] ?? 0) * 9); @endphp
        <tr>
          @if($gi === 0 && $ri === 0)
            <td class="prog" rowspan="{{ $programSpan }}">{{ $programLabel }}</td>
          @endif
          @if($ri === 0)
            <td class="prog" rowspan="{{ count($group['rows']) }}">{{ $group['label'] }}</td>
          @endif
          <td class="ind" style="padding-left:{{ $pad }}px">{{ $row['label'] }}</td>
          @if($row['heading'] ?? false)
            <td class="blocked"></td>
            <td class="blocked"></td><td class="blocked"></td>
            <td class="blocked"></td><td class="blocked"></td>
            <td class="blocked"></td><td class="blocked"></td>
          @else
            <td class="num">{!! $cell($row['target'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['prev_total'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['prev_female'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['curr_total'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['curr_female'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['cum_total'] ?? null) !!}</td>
            <td class="num">{!! $cell($row['cum_female'] ?? null) !!}</td>
          @endif
        </tr>
      @endforeach
    @endforeach

    <!-- Other Accomplishments -->
    <tr>
      <td colspan="10" style="font-weight:bold;text-transform:uppercase">OTHER ACCOMPLISHMENTS:</td>
    </tr>
    <tr>
      <td colspan="3" style="text-transform:uppercase; font-size:6px;">FIRST TIME JOBSEEKER ACT (Attachment Included)</td>
      <td class="blocked"></td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.previous_ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.ftja_total')) !!}</td>
      <td class="num" colspan="2">{!! $cell($v('other_accomplishments.cumulative_ftja_total')) !!}</td>
    </tr>

    <!-- Issues and Concerns -->
    <tr>
      <td colspan="10" style="font-weight:bold; border-bottom:none;">
        ISSUES / CONCERNS: (Indicate the issues and/or concerns that were encountered by the PESO in the delivery/provision of services, particularly those needing immediate action.)
      </td>
    </tr>
    <tr>
      <td colspan="10" style="white-space:pre-wrap; height:62px; border-top:none;">{!! $cell($v('issues_concerns')) !!}</td>
    </tr>

    <!-- Signatories -->
    <tr>
      <td colspan="10" style="padding:0;">
        <table style="width:100%; border:none;">
          <tr>
            <td style="width:33.33%; border:none; padding:6px 8px; vertical-align:top;">
              <div style="font-weight:bold; text-align:left; margin-bottom:14px;">PREPARED BY:</div>
              <table style="width:100%; border:none;">
                <tr>
                  <td style="width:25%; border:none; padding:1px;">NAME:</td>
                  <td style="width:75%; border:none; border-bottom:0.8px solid #000; text-align:center; padding:1px; font-weight:bold;">{{ data_get($signatories, 'prepared_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border:none; padding:1px;">SIGNATURE:</td>
                  <td style="border:none; border-bottom:0.8px solid #000; padding:1px; height:14px;"></td>
                </tr>
                <tr>
                  <td colspan="2" style="border:none; text-align:center; padding:2px;">SLEO/PESO Coordinator</td>
                </tr>
                <tr>
                  <td style="border:none; padding:1px;">DATE:</td>
                  <td style="border:none; padding:1px;">{{ date('m/d/Y') }}</td>
                </tr>
              </table>
            </td>

            <td style="width:33.33%; border:none; padding:6px 8px; vertical-align:top;">
              <div style="font-weight:bold; text-align:left; margin-bottom:14px;">CHECKED BY:</div>
              <table style="width:100%; border:none;">
                <tr>
                  <!-- Blank row so the underline below lines up with SIGNATURE: on the left. -->
                  <td style="border:none; padding:1px; height:13px;"></td>
                </tr>
                <tr>
                  <td style="border:none; border-bottom:0.8px solid #000; text-align:center; padding:1px; height:14px; font-weight:bold;">{{ data_get($signatories, 'checked_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border:none; text-align:center; padding:2px;">CGADH1/PESO Manager</td>
                </tr>
                <tr>
                  <td style="border:none; padding:1px; text-align:left;">DATE: {{ date('m/d/Y') }}</td>
                </tr>
              </table>
            </td>

            <td style="width:33.33%; border:none; padding:6px 8px; vertical-align:top;">
              <div style="font-weight:bold; text-align:left; margin-bottom:14px;">APPROVED BY:</div>
              <table style="width:100%; border:none;">
                <tr>
                  <td style="width:25%; border:none; padding:1px;">NAME:</td>
                  <td style="width:75%; border:none; border-bottom:0.8px solid #000; text-align:center; padding:1px; font-weight:bold;">{{ data_get($signatories, 'approved_by.name', '') }}</td>
                </tr>
                <tr>
                  <td style="border:none; padding:1px;">SIGNATURE:</td>
                  <td style="border:none; border-bottom:0.8px solid #000; padding:1px; height:14px;"></td>
                </tr>
                <tr>
                  <td colspan="2" style="border:none; text-align:center; padding:2px;">City Mayor</td>
                </tr>
                <tr>
                  <td style="border:none; padding:1px;">DATE:</td>
                  <td style="border:none; padding:1px;"></td>
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
