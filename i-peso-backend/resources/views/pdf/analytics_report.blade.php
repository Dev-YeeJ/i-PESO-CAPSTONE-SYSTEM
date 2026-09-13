<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:'DejaVu Sans',sans-serif;font-size:10px;color:#0f172a}
h1{font-size:16px;margin:0 0 2px}
.meta{color:#475569;font-size:9px;margin-bottom:16px}
.block{margin-bottom:14px}
.block h2{font-size:11px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #cbd5e1;padding-bottom:3px;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:4px}
th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:left;font-size:9px;vertical-align:top}
th{background:#f1f5f9}
.metrics td.label{font-weight:bold;width:45%}
</style></head><body>

<h1>{{ $report->title }}</h1>
<div class="meta">
    {{ ucwords(str_replace('_', ' ', $report->report_category)) }} ·
    Coverage {{ \Illuminate\Support\Carbon::parse($report->coverage_start)->format('M d, Y') }}
    – {{ \Illuminate\Support\Carbon::parse($report->coverage_end)->format('M d, Y') }} ·
    Generated {{ $report->created_at->format('M d, Y h:i A') }}
</div>

@forelse($blocks as $block)
  <div class="block">
    <h2>{{ $block['title'] }}</h2>
    @if($block['type'] === 'table')
      <table>
        <thead>
          <tr>@foreach($block['columns'] as $column)<th>{{ ucwords(str_replace('_', ' ', $column)) }}</th>@endforeach</tr>
        </thead>
        <tbody>
          @forelse($block['rows'] as $row)
            <tr>@foreach($block['columns'] as $column)<td>{{ is_array($row[$column] ?? null) ? json_encode($row[$column]) : ($row[$column] ?? '—') }}</td>@endforeach</tr>
          @empty
            <tr><td colspan="{{ count($block['columns']) }}">No data.</td></tr>
          @endforelse
        </tbody>
      </table>
    @else
      <table class="metrics">
        @foreach($block['rows'] as $label => $value)
          <tr>
            <td class="label">{{ $label }}</td>
            <td>{{ is_array($value) ? json_encode($value) : (is_bool($value) ? ($value ? 'Yes' : 'No') : ($value ?? '—')) }}</td>
          </tr>
        @endforeach
      </table>
    @endif
  </div>
@empty
  <p>This report contains no data for the selected period.</p>
@endforelse

</body></html>
