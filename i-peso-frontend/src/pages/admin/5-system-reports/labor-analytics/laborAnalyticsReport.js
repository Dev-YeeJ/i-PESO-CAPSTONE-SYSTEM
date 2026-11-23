// What the Analytics Dashboard's downloads contain: one chart spec per chart card
// (see utils/chartTable.js), the summary page and the forecast appendix of the full
// report, and the coverage lines printed on every page. Built from the same API data
// the dashboard shows, so a download always matches the screen.
import { CHART_COLORS } from '@/design-system/chartColors'
import { formatCount } from '@/utils/chartTable'

export const REPORT_TITLE = 'Labor Market Analytics Report'

const TRENDS = 'Applicant and employment trends'
const SKILLS = 'Skills and job demand'
const LOCATIONS = 'Location analytics'
const COMPANIES = 'Company and vacancy analytics'

export function pretty(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatPeriod(value) {
  const text = String(value || '')
  if (/^\d{4}-\d{2}$/.test(text)) return new Date(`${text}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
  return text
}

const longDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

/** "Coverage: Dec 1, 2025 – Nov 23, 2026", "Period: Monthly", plus any extra filter. */
export function coverageLines(appliedFilters, chips = []) {
  const { date_from: from, date_to: to, period } = appliedFilters
  return [
    from && to ? `Coverage: ${longDate(from)} – ${longDate(to)}` : 'Coverage: all dates',
    `Period: ${pretty(period || 'monthly')}`,
    ...chips.map(([key, value]) => `${pretty(key)}: ${value}`),
  ]
}

/** Two period series side by side: [{ x: '2026-03', a: 4, b: 9 }]. */
function trendRows(first = [], second = []) {
  const rows = new Map()
  first.forEach(({ period, value }) => rows.set(period, { x: period, a: value ?? 0, b: 0 }))
  second.forEach(({ period, value }) => rows.set(period, { ...(rows.get(period) ?? { x: period, a: 0 }), b: value ?? 0 }))
  return [...rows.values()].sort((left, right) => String(left.x).localeCompare(String(right.x)))
}

const items = (list) => (Array.isArray(list) ? list.map(({ label, value }) => ({ label, value })) : [])

/** The 17 chart cards, in page order. */
export function buildAnalyticsSpecs(data, appliedFilters) {
  const trends = data?.trends ?? {}
  const distributions = data?.distributions ?? {}
  const top = data?.top_lists ?? {}
  const period = pretty(appliedFilters.period || 'monthly')
  const trend = (id, title, subtitle, first, second, labels) => ({
    id, title, subtitle, section: TRENDS, kind: 'line', xLabel: 'Period', formatX: formatPeriod,
    rows: trendRows(first, second),
    series: [{ key: 'a', label: labels[0], color: CHART_COLORS[0] }, { key: 'b', label: labels[1], color: CHART_COLORS[1] }],
  })
  const bars = (id, section, title, list, extra = {}) => ({ id, section, title, kind: 'bar', items: items(list), chartLimit: 10, ...extra })

  return [
    trend('registrations-vs-applications', 'Registered Job Seekers vs Job Applications Submitted', `${period} counts within the selected range.`,
      trends.registered_job_seekers, trends.job_applications_submitted, ['Registered Job Seekers', 'Job Applications Submitted']),
    trend('employment-activity', 'Employment Activity', 'Hires and newly posted vacancies over time.',
      trends.hired_applicants, trends.vacancy_postings, ['Hired Applicants', 'Vacancy Postings']),
    {
      id: 'employment-status', section: TRENDS, kind: 'donut', title: 'Current Employment Status',
      subtitle: 'Current distribution; status history is not stored.', itemLabel: 'Employment status', valueLabel: 'Job seekers',
      items: items(distributions.employment_status), notes: [data?.meta?.unemployment_note],
    },
    {
      id: 'gender', section: TRENDS, kind: 'donut', title: 'Gender Distribution',
      subtitle: 'Registered job seekers with available sex data.', itemLabel: 'Sex', valueLabel: 'Job seekers',
      items: items(distributions.gender),
    },
    bars('educational-attainment', TRENDS, 'Educational Attainment', distributions.educational_attainment,
      { subtitle: 'Top recorded attainment levels.', itemLabel: 'Educational attainment', valueLabel: 'Job seekers', share: true }),

    bars('seeker-skills', SKILLS, 'Common Job Seeker Skills', top.job_seeker_skills, { itemLabel: 'Skill', subtitle: 'Skills most often listed on job seeker profiles.' }),
    bars('demanded-skills', SKILLS, 'Demanded Vacancy Skills', top.vacancy_demanded_skills, { itemLabel: 'Skill', color: CHART_COLORS[1], subtitle: 'Skills most often required on vacancies.' }),
    bars('applied-categories', SKILLS, 'Most Applied Job Categories', top.most_applied_job_categories, { itemLabel: 'Job category', valueLabel: 'Applications', color: CHART_COLORS[2] }),

    bars('seekers-by-barangay', LOCATIONS, 'Job Seekers by Barangay', distributions.job_seeker_locations?.barangay, { itemLabel: 'Barangay', valueLabel: 'Job seekers', subtitle: 'Top locations only.' }),
    bars('seekers-by-city', LOCATIONS, 'Job Seekers by City / Municipality', distributions.job_seeker_locations?.city_municipality, { itemLabel: 'City / Municipality', valueLabel: 'Job seekers', color: CHART_COLORS[1], subtitle: 'Top locations only.' }),
    bars('employers-by-location', LOCATIONS, 'Employers by Location', distributions.employer_locations?.city_municipality, { itemLabel: 'City / Municipality', valueLabel: 'Employers', color: CHART_COLORS[3], subtitle: 'Top locations only.' }),
    bars('vacancies-by-location', LOCATIONS, 'Vacancies by Location', distributions.vacancy_locations?.city_municipality, { itemLabel: 'City / Municipality', valueLabel: 'Vacancies', color: CHART_COLORS[2], subtitle: 'Top locations only.' }),

    bars('active-hiring-companies', COMPANIES, 'Most Active Hiring Companies', top.most_active_hiring_companies, { itemLabel: 'Company', unit: 'applications', subtitle: 'Ranked by applications received.' }),
    bars('companies-most-vacancies', COMPANIES, 'Companies with Most Vacancies', top.companies_with_most_vacancies, { itemLabel: 'Company', unit: 'vacancies', color: CHART_COLORS[2], subtitle: 'Ranked by vacancies posted.' }),
    bars('companies-highest-hires', COMPANIES, 'Companies with Highest Hires', top.companies_with_highest_hires, { itemLabel: 'Company', unit: 'hires', color: CHART_COLORS[5], subtitle: 'Ranked by confirmed hires.' }),
    {
      id: 'vacancies-by-status', section: COMPANIES, kind: 'donut', title: 'Job Vacancies by Status',
      itemLabel: 'Status', valueLabel: 'Vacancies', items: items(distributions.vacancy_status).map((item) => ({ ...item, label: pretty(item.label) })),
    },
    bars('vacancies-by-category', COMPANIES, 'Job Vacancies by Category / Occupation', top.vacancies_by_category, { itemLabel: 'Category / occupation', valueLabel: 'Vacancies' }),
  ]
}

/** The full report's summary page: every headline number on the dashboard. */
export function buildSummary(data) {
  const s = data?.summary ?? {}
  return {
    title: 'Summary of indicators',
    subtitle: 'Headline numbers for the selected coverage.',
    rows: [
      ['Total registered applicants', formatCount(s.total_registered_applicants), `${formatCount(s.complete_profiles)} complete, ${formatCount(s.incomplete_profiles)} incomplete profiles`],
      ['Active participants', formatCount(s.active_participants), 'Job seekers with recorded activity in the range'],
      ['Total employers', formatCount(s.total_employers), `${formatCount(s.verified_employers)} verified`],
      ['Job vacancies', formatCount(s.total_job_vacancies), `${formatCount(s.active_job_vacancies)} active, ${formatCount(s.closed_job_vacancies)} closed`],
      ['Total applications', formatCount(s.total_applications), `${formatCount(s.pending_applications)} pending`],
      ['Hired applicants', formatCount(s.hired_applicants), 'Applications with status "hired"'],
      ['Unemployed applicants', formatCount(s.unemployed_applicants), 'Current self-reported status (not an unemployment rate)'],
      ['Scheduled interviews', formatCount(s.scheduled_interviews), 'Currently scheduled'],
      ['Job fairs conducted', formatCount(s.job_fairs_conducted), `${formatCount(s.job_fair_participating_companies)} participating companies`],
      ['Job fair vacancies', formatCount(s.job_fair_vacancies), `${formatCount(s.job_fair_applicants)} applicants`],
      ['Job fair HOTS (hired on the spot)', formatCount(s.job_fair_hots), `${formatCount(s.job_fair_near_hired)} near hired`],
      ['Job fair rejected', formatCount(s.job_fair_rejected), 'Self-service and proxy reports'],
    ],
    notes: [
      s.active_participants_definition && `Active participants: ${s.active_participants_definition}`,
      data?.meta?.unemployment_note,
    ].filter(Boolean),
  }
}

/** The experimental forecast as a table at the end of the full report (when available). */
export function buildForecastAppendix(data) {
  const forecast = data?.forecast ?? {}
  const rows = Array.isArray(forecast.items) ? forecast.items : []
  if (!forecast.available || !rows.length) return []
  return [{
    title: 'Experimental forecast: next-month labor demand',
    subtitle: forecast.explanation,
    columns: ['Category', 'Predicted postings', 'Trend', 'R² fit'],
    rows: rows.map((item) => [
      item.item || 'Unspecified category',
      formatCount(item.predicted_next_month_count),
      pretty(item.trend_direction || 'stable'),
      Number.isFinite(Number(item.r_squared)) ? Number(item.r_squared).toFixed(2) : 'n/a',
    ]),
    notes: [forecast.confidence_note, 'Experimental: a statistical signal, not an official projection.'].filter(Boolean),
  }]
}
