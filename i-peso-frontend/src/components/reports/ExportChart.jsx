import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_TEXT, CHART_COLORS, CHART_GRID } from '@/design-system/chartColors'

/**
 * A chart drawn at a fixed print size for downloads: no ResponsiveContainer, no
 * animation, no tooltips, so the same chart comes out the same from any screen.
 * Every chart page describes its chart as a `spec` (see utils/chartReport.js).
 */
export default function ExportChart({ spec, width = 920, height = 360 }) {
  const tick = { fontSize: 13, fill: CHART_AXIS_TEXT }
  const formatX = spec.formatX ?? ((value) => value)

  if (spec.kind === 'line' || spec.kind === 'area') {
    const Chart = spec.kind === 'area' ? AreaChart : LineChart
    return (
      <Chart width={width} height={height} data={spec.rows} margin={{ top: 12, right: 24, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="x" tickFormatter={formatX} tick={tick} minTickGap={16} />
        <YAxis allowDecimals={false} tick={tick} width={48} />
        {spec.series.length > 1 && <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: 13 }} />}
        {spec.series.map((series, index) => {
          const color = series.color ?? CHART_COLORS[index % CHART_COLORS.length]
          return spec.kind === 'area'
            ? <Area key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2.5} isAnimationActive={false} />
            : <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={color} strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
        })}
      </Chart>
    )
  }

  if (spec.kind === 'columns') {
    return (
      <BarChart width={width} height={height} data={spec.rows.slice(0, spec.chartLimit ?? spec.rows.length)} margin={{ top: 12, right: 24, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="x" tickFormatter={(value) => truncate(formatX(value), 18)} tick={tick} interval={0} />
        <YAxis allowDecimals={false} tick={tick} width={48} />
        <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: 13 }} />
        {spec.series.map((series, index) => (
          <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color ?? CHART_COLORS[index % CHART_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    )
  }

  const items = (spec.items ?? []).slice(0, spec.chartLimit ?? 10)

  if (spec.kind === 'donut') {
    return (
      <PieChart width={width} height={height}>
        <Pie
          data={items} dataKey="value" nameKey="label" cx="50%" cy="50%"
          innerRadius={Math.round(height * 0.22)} outerRadius={Math.round(height * 0.36)} paddingAngle={2}
          label={({ percent }) => (percent >= 0.04 ? `${Math.round(percent * 100)}%` : '')} labelLine={false}
          isAnimationActive={false}
        >
          {items.map((item, index) => <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
        </Pie>
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 13, maxWidth: width * 0.4 }} formatter={(value) => truncate(value, 34)} />
      </PieChart>
    )
  }

  // 'bar': horizontal bars for rankings and long category lists.
  return (
    <BarChart width={width} height={Math.max(height, items.length * 34 + 40)} data={items} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
      <XAxis type="number" allowDecimals={false} tick={tick} />
      <YAxis dataKey="label" type="category" width={230} tick={{ fontSize: 13, fill: '#334155' }} tickFormatter={(value) => truncate(value, 32)} />
      <Bar dataKey="value" name={spec.valueLabel ?? 'Count'} fill={spec.color ?? CHART_COLORS[0]} radius={[0, 5, 5, 0]} maxBarSize={26} isAnimationActive={false}
        label={{ position: 'right', fontSize: 12, fill: '#0f172a', formatter: (value) => Number(value).toLocaleString('en-PH') }} />
    </BarChart>
  )
}

function truncate(value, limit) {
  const text = String(value ?? 'Not specified')
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

/** The chart alone, white background, for placing inside a PDF page. */
export function ChartOnly({ spec }) {
  return (
    <div style={{ width: 960, background: '#ffffff', padding: 8 }}>
      <ExportChart spec={spec} width={944} height={380} />
    </div>
  )
}
